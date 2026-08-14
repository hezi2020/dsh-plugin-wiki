import { afterEach, describe, expect, it, vi } from 'vitest'
import { classifyFetchError, classifyHttpError, classifyRefreshFailure } from '../src/runtime/classify.ts'
import {
  computeSoftQuotaCacheTtlMs,
  decideRotation,
  isCoolingDown,
  isOverSoftQuota,
  isRateLimited,
  pickNextAccountIndex,
  recordRateLimit,
} from '../src/runtime/rotation.ts'
import {
  buildFingerprintHeaders,
  generateFingerprint,
  getRandomizedHeaders,
  recordFingerprintVersion,
  restoreFingerprint,
  updateFingerprintVersion,
} from '../src/runtime/fingerprint.ts'
import { deriveAntigravitySessionId, generateAntigravityRequestId, generateAntigravitySessionId } from '../src/runtime/identity.ts'
import { resolveAntigravityVersion } from '../src/runtime/version.ts'
import type { ManagedAccount } from '../src/types.ts'

function account(): ManagedAccount {
  return { email: 'a@b.c', refresh: 'rt|p', addedAt: 0, lastUsed: 0 }
}

describe('classifyHttpError', () => {
  it('classifies 429 with Retry-After and resetTime', () => {
    const headers = new Headers({ 'retry-after': '120' })
    const result = classifyHttpError(429, headers, JSON.stringify({ resetTime: '2099-01-01T00:00:00Z' }))
    expect(result.kind).toBe('rate-limit')
    expect(result.retryAfterMs).toBe(120_000)
    expect(result.resetTime).toBe('2099-01-01T00:00:00Z')
  })

  it('sub-classifies 429 bodies into quota/soft/rate categories', () => {
    const quota = classifyHttpError(429, new Headers(), JSON.stringify({ error: { message: 'Individual quota reached. Contact your administrator to enable overages.' } }))
    expect(quota.rateLimitCategory).toBe('quota_exhausted')
    const soft = classifyHttpError(429, new Headers({ 'retry-after': '1' }), '{}')
    expect(soft.rateLimitCategory).toBe('soft_rate_limit')
    const rate = classifyHttpError(429, new Headers({ 'retry-after': '120' }), '{}')
    expect(rate.rateLimitCategory).toBe('rate_limited')
    const unknown = classifyHttpError(429, new Headers(), '{}')
    expect(unknown.rateLimitCategory).toBe('unknown')
    const resource = classifyHttpError(429, new Headers(), JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED' } }))
    expect(resource.rateLimitCategory).toBe('quota_exhausted')
  })

  it('classifies 401 and plain 403 as auth-failure', () => {
    expect(classifyHttpError(401, new Headers()).kind).toBe('auth-failure')
    expect(classifyHttpError(403, new Headers()).kind).toBe('auth-failure')
  })

  it('classifies 403 quota walls (RESOURCE_EXHAUSTED) as rate-limit', () => {
    const quota = classifyHttpError(
      403,
      new Headers(),
      JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: 'Individual quota reached.' } }),
    )
    expect(quota.kind).toBe('rate-limit')
    expect(quota.rateLimitCategory).toBe('quota_exhausted')
    const plain = classifyHttpError(403, new Headers(), '{"error":"access_denied"}')
    expect(plain.kind).toBe('auth-failure')
  })

  it('classifies 5xx as transient with backoff retry', () => {
    expect(classifyHttpError(503, new Headers()).kind).toBe('transient')
    expect(classifyHttpError(400, new Headers()).kind).toBe('transient')
  })

  it('classifies fetch failures as network-error', () => {
    expect(classifyFetchError(new TypeError('fetch failed')).kind).toBe('network-error')
    expect(classifyFetchError(new DOMException('aborted', 'AbortError')).kind).toBe('network-error')
  })

  it('classifies refresh failures', () => {
    expect(classifyRefreshFailure(400, 'invalid_grant').kind).toBe('auth-failure')
    expect(classifyRefreshFailure(429).kind).toBe('rate-limit')
  })
})

describe('rotation state machine', () => {
  it('rotates on rate-limit with backoff', () => {
    const acc = account()
    const decision = decideRotation('rate-limit', acc, 0, undefined, 'rate_limited')
    expect(decision.action).toBe('rotate')
    expect(acc.coolingDownUntil).toBeGreaterThan(Date.now())
    expect(decision.backoffMs).toBeGreaterThan(0)
  })

  it('retries immediately on soft rate limits without touching the account', () => {
    const acc = account()
    const decision = decideRotation('rate-limit', acc, 0, 1500, 'soft_rate_limit')
    expect(decision.action).toBe('retry')
    expect(acc.coolingDownUntil).toBeUndefined()
  })

  it('applies a 24h cooldown on daily quota exhaustion', () => {
    const acc = account()
    const decision = decideRotation('rate-limit', acc, 0, undefined, 'quota_exhausted')
    expect(decision.action).toBe('cool')
    expect(acc.coolingDownUntil! - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000)
  })

  it('revokes on auth-failure and disables the account', () => {
    const acc = account()
    const decision = decideRotation('auth-failure', acc, 2)
    expect(decision.action).toBe('revoke')
    expect(acc.enabled).toBe(false)
    expect(acc.verificationRequired).toBe(true)
  })

  it('retries transient failures without mutating state', () => {
    const acc = account()
    const decision = decideRotation('transient', acc, 0)
    expect(decision.action).toBe('retry')
    expect(acc.coolingDownUntil).toBeUndefined()
  })

  it('backs off exponentially across tiers', () => {
    const acc = account()
    const d0 = decideRotation('network-error', acc, 0)
    const acc5 = account()
    const d5 = decideRotation('network-error', acc5, 5)
    expect(d5.backoffMs).toBeGreaterThan(d0.backoffMs)
  })

  it('picks the next eligible account round-robin', () => {
    const a = { ...account(), email: 'a' }
    const b = { ...account(), email: 'b' }
    const c = { ...account(), email: 'c' }
    const accounts = [a, b, c]
    expect(pickNextAccountIndex(accounts, 0)).toBe(1)
    expect(pickNextAccountIndex(accounts, 2)).toBe(0)
    // cooling accounts are skipped
    const cooling = { ...account(), email: 'd', coolingDownUntil: Date.now() + 60_000 }
    expect(pickNextAccountIndex([a, cooling, c], 0)).toBe(2)
    // single account stays put
    expect(pickNextAccountIndex([a], 0)).toBe(0)
  })

  it('tracks rate limits and cooldowns', () => {
    const acc = account()
    recordRateLimit(acc, 'gemini-x', Date.now() + 5000)
    expect(isRateLimited(acc)).toBe(true)
    expect(isCoolingDown(acc)).toBe(false)
    const cooled = { ...account(), coolingDownUntil: Date.now() + 5000 }
    expect(isCoolingDown(cooled)).toBe(true)
  })

  it('soft quota pre-check avoids burning requests', () => {
    const acc = account()
    expect(isOverSoftQuota(acc, 'm1')).toBe(false)
    acc.cachedQuota = { m1: { remainingFraction: 0.05 } }
    expect(isOverSoftQuota(acc, 'm1')).toBe(true)
    expect(isOverSoftQuota(acc, 'm2')).toBe(false)
    acc.cachedQuota = { m1: { remainingFraction: 0.05, resetTime: '2000-01-01T00:00:00Z' } }
    expect(isOverSoftQuota(acc, 'm1')).toBe(false)
  })

  it('computes quota cache TTLs by health', () => {
    expect(computeSoftQuotaCacheTtlMs(0.05)).toBe(60_000)
    expect(computeSoftQuotaCacheTtlMs(0.3)).toBe(5 * 60 * 1000)
    expect(computeSoftQuotaCacheTtlMs(0.9)).toBe(15 * 60 * 1000)
    expect(computeSoftQuotaCacheTtlMs(undefined)).toBe(10 * 60 * 1000)
  })
})

describe('fingerprint', () => {
  it('generates valid fingerprints from the external data', () => {
    const fp = generateFingerprint()
    expect(fp.deviceId).toMatch(/^[0-9a-f-]{36}$/)
    expect(fp.sessionToken).toMatch(/^[0-9a-f]{32}$/)
    expect(fp.userAgent).toMatch(/^antigravity\/\d+\.\d+\.\d+ (windows|darwin)\/\S+$/)
    expect(fp.clientMetadata.ideType).toBe('ANTIGRAVITY')
    expect(['WINDOWS', 'MACOS']).toContain(fp.clientMetadata.platform)
  })

  it('composes only User-Agent from a fingerprint', () => {
    expect(buildFingerprintHeaders(null)).toEqual({})
    const fp = generateFingerprint()
    const headers = buildFingerprintHeaders(fp)
    expect(headers['User-Agent']).toBe(fp.userAgent)
    expect(Object.keys(headers)).toEqual(['User-Agent'])
  })

  it('randomizes per-request headers across the pools', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const headers = getRandomizedHeaders()
      expect(headers['Client-Metadata']).toContain('"ideType":"ANTIGRAVITY"')
      seen.add(headers['X-Goog-Api-Client'])
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('updates the version inside a fingerprint UA', () => {
    const fp = generateFingerprint()
    const before = fp.userAgent
    expect(updateFingerprintVersion(fp, '9.9.9')).toBe(true)
    expect(fp.userAgent).toContain('antigravity/9.9.9')
    expect(updateFingerprintVersion(fp, '9.9.9')).toBe(false)
    expect(fp.userAgent).toBe(before.replace(/antigravity\/[\d.]+/, 'antigravity/9.9.9'))
  })

  it('bounds history and restores prior fingerprints', () => {
    let history: ReturnType<typeof recordFingerprintVersion> | undefined
    const first = generateFingerprint()
    history = recordFingerprintVersion(history, first, 'initial')
    for (let i = 0; i < 3; i++) {
      history = recordFingerprintVersion(history, generateFingerprint(), 'regenerated')
    }
    expect(history!.length).toBe(4)
    expect(restoreFingerprint(history, generateFingerprint())?.deviceId).toBe(first.deviceId)
    // eviction: after 8 regenerations the initial entry is gone; nothing restorable remains
    let evicted = history
    for (let i = 0; i < 8; i++) {
      evicted = recordFingerprintVersion(evicted, generateFingerprint(), 'regenerated')
    }
    expect(evicted!.length).toBe(5)
    const current = generateFingerprint()
    expect(restoreFingerprint(evicted, current)?.deviceId).toBe(current.deviceId)
  })
})

describe('identity', () => {
  it('generates request ids and session ids in backend shape', () => {
    expect(generateAntigravityRequestId()).toMatch(/^agent\/\d+\/[0-9a-f]{8}$/)
    expect(generateAntigravitySessionId()).toMatch(/^-\d{1,19}$/)
  })

  it('derives stable per-account session ids', () => {
    const a = deriveAntigravitySessionId('user@example.com')
    const b = deriveAntigravitySessionId('user@example.com')
    expect(a).toBe(b)
    expect(a).toMatch(/^-\d+$/)
    expect(deriveAntigravitySessionId('')).toBeNull()
    expect(deriveAntigravitySessionId(null)).toBeNull()
  })
})

describe('version resolver', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('picks the newest semver from sources', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('antigravity-auto-updater')) {
        return new Response(JSON.stringify([{ version: '1.15.0' }, { version: '1.20.1' }]), { status: 200 })
      }
      return new Response(JSON.stringify({ tag_name: 'v1.19.0' }), { status: 200 })
    }) as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

    const version = await resolveAntigravityVersion(fetchImpl)
    expect(version).toBe('1.20.1')
  })

  it('falls back to the pinned version when sources fail', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    const version = await resolveAntigravityVersion(fetchImpl)
    expect(version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
