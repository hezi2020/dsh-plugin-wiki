/**
 * Account session manager: the shared runtime glue between the store, the
 * OAuth refresh path, rotation/fingerprint logic, and the adapter. Used by the
 * in-harness plugin shell, the CLI, and the web routes.
 */

import type { AgyAccountSession } from './adapter/adapter.ts'
import type { AccountStorageV4, FailureKind, ManagedAccount, OAuthAuthDetails } from './types.ts'
import { refreshAccessToken } from './oauth/refresh.ts'
import { accessTokenExpired, formatRefreshParts, parseRefreshParts } from './oauth/auth.ts'
import type { AccountStore } from './store/accounts.ts'
import { resolveActiveAccount } from './store/accounts.ts'
import {
  clearExpiredState,
  decideRotation,
  isCoolingDown,
  pickNextAccountIndex,
} from './runtime/rotation.ts'
import {
  DEFAULT_FINGERPRINT_DATA,
  generateFingerprint,
  getRandomizedHeaders,
  recordFingerprintVersion,
  updateFingerprintVersion,
} from './runtime/fingerprint.ts'
import { deriveAntigravitySessionId } from './runtime/identity.ts'
import { peekCachedAntigravityVersion, resolveAntigravityVersionBounded } from './runtime/version.ts'
import type { Fingerprint } from './types.ts'

export interface SessionManagerOptions {
  store: AccountStore
  /** Called after rotation changes the active index (for logging/UI). */
  onRotate?: (fromIndex: number, toIndex: number, reason: FailureKind) => void
}

interface TokenCacheEntry {
  access: string
  expires: number
}

/**
 * Resolve the impersonation headers for one request from the account's
 * persistent fingerprint (stable identity), falling back to full per-request
 * randomization when the account has no fingerprint yet.
 */
export function impersonationHeadersFor(account: ManagedAccount): AgyAccountSession['impersonation'] {
  const fingerprint = account.fingerprint
  if (fingerprint) {
    return {
      'User-Agent': fingerprint.userAgent,
      'X-Goog-Api-Client': fingerprint.apiClient,
      'Client-Metadata': JSON.stringify(fingerprint.clientMetadata),
    }
  }
  const randomized = getRandomizedHeaders(DEFAULT_FINGERPRINT_DATA)
  return {
    'User-Agent': randomized['User-Agent'],
    'X-Goog-Api-Client': randomized['X-Goog-Api-Client'],
    'Client-Metadata': randomized['Client-Metadata'],
  }
}

export class AgySessionManager {
  private readonly store: AccountStore
  private readonly onRotate: SessionManagerOptions['onRotate']
  private readonly tokenCache = new Map<string, TokenCacheEntry>()
  /** In-flight refresh promises keyed by account: concurrent requests share one refresh. */
  private readonly refreshInFlight = new Map<string, Promise<OAuthAuthDetails | undefined>>()
  private readonly failureCounts = new Map<string, number>()
  /** Accounts whose request-time project discovery already failed (no retry per request). */
  private readonly projectRetryFailed = new Set<string>()

  constructor(options: SessionManagerOptions) {
    this.store = options.store
    this.onRotate = options.onRotate
  }

  private accountKey(account: ManagedAccount): string {
    return account.email ?? `idx-${account.refresh}`
  }

  /** Resolve a usable access token for the account, refreshing when expired. */
  private async accessTokenFor(account: ManagedAccount): Promise<OAuthAuthDetails | undefined> {
    const key = this.accountKey(account)
    const cached = this.tokenCache.get(key)
    const now = Date.now()
    if (cached && !accessTokenExpired({ access: cached.access, expires: cached.expires, refresh: account.refresh })) {
      return { access: cached.access, expires: cached.expires, refresh: account.refresh }
    }

    const inFlight = this.refreshInFlight.get(key)
    if (inFlight) return inFlight

    const refreshing = (async (): Promise<OAuthAuthDetails | undefined> => {
      const result = await refreshAccessToken({ access: cached?.access ?? '', expires: cached?.expires ?? 0, refresh: account.refresh })
      if (result.type === 'success') {
        this.tokenCache.set(key, { access: result.auth.access, expires: result.auth.expires })
        return result.auth
      }
      if (result.type === 'revoked') {
        // Account credentials are dead — mark it disabled; the next failure path
        // will surface the message.
        this.tokenCache.delete(key)
        return undefined
      }
      return undefined
    })()

    this.refreshInFlight.set(key, refreshing)
    try {
      return await refreshing
    } finally {
      this.refreshInFlight.delete(key)
    }
  }

  private async pickAccount(storage: AccountStorageV4): Promise<{ account: ManagedAccount; index: number } | undefined> {
    const now = Date.now()
    for (const account of storage.accounts) clearExpiredState(account, now)

    let resolved = resolveActiveAccount(storage)
    if (!resolved) return undefined
    // Skip accounts that are cooling down (rate-limit cooldowns).
    if (isCoolingDown(resolved.account, now)) {
      const nextIndex = pickNextAccountIndex(storage.accounts, resolved.index, now)
      if (nextIndex !== resolved.index) {
        resolved = { account: storage.accounts[nextIndex]!, index: nextIndex }
      }
    }
    return resolved
  }

  /**
   * Adapter hook: resolve the active session (refresh if needed), healing a
   * missing projectId at request time — the OAuth-time loadCodeAssist may have
   * transiently failed even when the Google account owns a Cloud Code project
   * (mirrors OmniRoute's ensureAntigravityProjectAssigned + persistence).
   */
  async getSession(): Promise<AgyAccountSession | undefined> {
    const storage = await this.store.load()
    const picked = await this.pickAccount(storage)
    if (!picked) return undefined

    const auth = await this.accessTokenFor(picked.account)
    if (!auth) return undefined

    const key = this.accountKey(picked.account)
    if (!picked.account.projectId && !this.projectRetryFailed.has(key)) {
      try {
        const { loadCodeAssist } = await import('./oauth/exchange.ts')
        const { projectId } = await loadCodeAssist(auth.access)
        if (projectId) {
          await this.store.mutate((s) => {
            const account = s.accounts[picked.index]
            if (account) {
              account.projectId = projectId
              // Keep the packed refresh string in sync.
              const parts = parseRefreshParts(account.refresh)
              account.refresh = formatRefreshParts({
                refreshToken: parts.refreshToken,
                projectId,
                managedProjectId: parts.managedProjectId,
              })
            }
          })
          picked.account.projectId = projectId
        } else {
          this.projectRetryFailed.add(key)
        }
      } catch {
        this.projectRetryFailed.add(key)
      }
    }

    return {
      auth,
      account: picked.account,
      index: picked.index,
      impersonation: impersonationHeadersFor(picked.account),
    }
  }

  /** Adapter hook: apply rotation decisions and fingerprint regeneration. */
  async reportFailure(
    kind: FailureKind,
    session: AgyAccountSession,
    info?: { retryAfterMs?: number; status?: number; rateLimitCategory?: import('./runtime/classify.ts').RateLimitCategory },
  ): Promise<void> {
    const storage = await this.store.load()
    const account = storage.accounts[session.index]
    if (!account) return

    const key = this.accountKey(account)
    const consecutive = (this.failureCounts.get(key) ?? 0) + 1
    this.failureCounts.set(key, consecutive)

    const decision = decideRotation(kind, account, consecutive, info?.retryAfterMs, info?.rateLimitCategory)

    if (decision.action === 'revoke') {
      this.tokenCache.delete(key)
      this.failureCounts.delete(key)
      await this.store.save(storage)
      return
    }

    // Fingerprint lifecycle: create on first rate-limit, regenerate after
    // repeated failures (bounded by history inside recordFingerprintVersion).
    // UA versions come from the version resolver (bounded, cached 6h) so
    // fingerprints never pin a stale Antigravity client version.
    if (kind === 'rate-limit') {
      if (!account.fingerprint) {
        account.fingerprint = generateFingerprint(undefined, await resolveAntigravityVersionBounded())
        account.fingerprintHistory = recordFingerprintVersion(account.fingerprintHistory, account.fingerprint, 'initial')
      } else {
        // In-place UA refresh from the cached version (no network on this path).
        const cached = peekCachedAntigravityVersion()
        if (cached) updateFingerprintVersion(account.fingerprint, cached)
        if (consecutive >= 2) {
          const fresh = generateFingerprint(undefined, await resolveAntigravityVersionBounded())
          account.fingerprintHistory = recordFingerprintVersion(account.fingerprintHistory, fresh, 'regenerated')
          account.fingerprint = fresh
        }
      }
    }

    if (decision.action === 'rotate') {
      const nextIndex = pickNextAccountIndex(storage.accounts, session.index)
      if (nextIndex !== session.index) {
        storage.activeIndex = nextIndex
        this.onRotate?.(session.index, nextIndex, kind)
      }
    }

    await this.store.save(storage)
  }

  /** Adapter hook: reset the failure counter after a clean completion. */
  async markSuccess(session: AgyAccountSession): Promise<void> {
    const account = session.account
    const key = this.accountKey(account)
    this.failureCounts.delete(key)
  }

  /**
   * Test call: one short streaming request against the live backend.
   * Returns the collected text or a structured error message.
   */
  async testCall(model: string, prompt = 'Reply with exactly: OK', maxTokens = 1024): Promise<{ ok: boolean; text?: string; error?: string }> {
    const session = await this.getSession()
    if (!session) return { ok: false, error: 'No agy account configured — run `dsh-agy login` first.' }
    try {
      const { toAgyRequestBody } = await import('./adapter/translate.ts')
      const { fetchAgyFirstOk } = await import('./oauth/constants.ts')
      const { parseAgySse } = await import('./adapter/parse.ts')
      const body = toAgyRequestBody(
        {
          provider: 'agy',
          model,
          messages: [{ id: 'test-1', role: 'user', content: [{ type: 'text', text: prompt }] }],
          maxTokens,
        } as never,
        { projectId: session.account.projectId, sessionId: deriveAntigravitySessionId(session.account.email) ?? undefined },
      )
      const headers = {
        authorization: `Bearer ${session.auth.access}`,
        'content-type': 'application/json',
        accept: 'text/event-stream',
        ...session.impersonation,
      }
      const response = await fetchAgyFirstOk('/v1internal:streamGenerateContent?alt=sse', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 300)}` }
      }
      if (!response.body) return { ok: false, error: 'no response body' }
      const text: string[] = []
      for await (const chunk of parseAgySse(response.body)) {
        if (chunk.type === 'text-delta') text.push(chunk.text)
      }
      return { ok: text.length > 0, text: text.join(''), error: text.length > 0 ? undefined : 'empty response' }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /** Export one account as a paste-credential blob (for migration to another host). */
  async exportBlob(index: number): Promise<{ blob?: string; error?: string }> {
    const storage = await this.store.load()
    const account = storage.accounts[index]
    if (!account) return { error: 'account not found' }
    const auth = await this.accessTokenFor(account)
    if (!auth) return { error: 'refresh failed (revoked?)' }
    const { encodeCredentialBlob } = await import('./oauth/blob.ts')
    const parts = parseRefreshParts(account.refresh)
    return {
      blob: encodeCredentialBlob('agy', {
        access_token: auth.access,
        refresh_token: parts.refreshToken,
        expires_in: Math.max(0, Math.round((auth.expires - Date.now()) / 1000)),
      }),
    }
  }

  /** CLI/web helper: verify an account's credentials (refresh + userinfo). */
  async verifyAccount(index: number): Promise<{ ok: boolean; email?: string; error?: string }> {
    const storage = await this.store.load()
    const account = storage.accounts[index]
    if (!account) return { ok: false, error: 'account not found' }
    const auth = await this.accessTokenFor(account)
    if (!auth) return { ok: false, error: 'refresh failed (revoked?)' }
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
        headers: { Authorization: `Bearer ${auth.access}` },
      })
      if (!response.ok) return { ok: false, error: `userinfo ${response.status}` }
      const info = (await response.json()) as { email?: string }
      // Credentials are live again — clear any auth-failure disable so the
      // account re-enters rotation without a manual re-import.
      await this.store.mutate((s) => {
        const target = s.accounts[index]
        if (target) {
          target.enabled = true
          target.verificationRequired = false
          target.verificationRequiredAt = undefined
          target.verificationRequiredReason = undefined
          target.verificationUrl = undefined
        }
      })
      return { ok: true, email: info.email }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }
}

export type { Fingerprint }
