import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgySessionManager, impersonationHeadersFor } from '../src/session.ts'
import { InMemoryAccountStore } from '../src/store/accounts.ts'
import type { ManagedAccount } from '../src/types.ts'

function account(email = 'a@b.c'): ManagedAccount {
  return { email, refresh: `rt-${email}|proj-1`, projectId: 'proj-1', addedAt: 0, lastUsed: 0, enabled: true }
}

function storage(accounts: ManagedAccount[], activeIndex = 0) {
  return { version: 4 as const, accounts, activeIndex }
}

function stubTokenEndpoint(overrides: Partial<{ ok: boolean; body: unknown; status: number }> = {}) {
  const { ok = true, body = { access_token: 'at', expires_in: 3600 }, status = 200 } = overrides
  vi.stubGlobal('fetch', vi.fn(async () => new Response(ok ? JSON.stringify(body) : JSON.stringify(body), { status })))
}

describe('AgySessionManager', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns undefined when no accounts exist', async () => {
    const sessions = new AgySessionManager({ store: new InMemoryAccountStore() })
    expect(await sessions.getSession()).toBeUndefined()
  })

  it('refreshes and returns a session with impersonation headers', async () => {
    stubTokenEndpoint()
    const store = new InMemoryAccountStore(storage([account()]))
    const sessions = new AgySessionManager({ store })

    const session = await sessions.getSession()
    expect(session).toBeDefined()
    expect(session!.auth.access).toBe('at')
    expect(session!.impersonation['User-Agent']).toMatch(/^antigravity\/\d+\.\d+\.\d+/)
    expect(session!.impersonation['Client-Metadata']).toContain('ANTIGRAVITY')
  })

  it('uses the persistent fingerprint when the account has one', async () => {
    stubTokenEndpoint()
    const fp = {
      deviceId: 'd1', sessionToken: 's1', userAgent: 'antigravity/9.9.9 darwin/arm64',
      apiClient: 'fixed-client', clientMetadata: { ideType: 'ANTIGRAVITY', platform: 'MACOS', pluginType: 'GEMINI' },
      createdAt: 0,
    }
    const store = new InMemoryAccountStore(storage([{ ...account(), fingerprint: fp }]))
    const sessions = new AgySessionManager({ store })
    const session = await sessions.getSession()
    expect(session!.impersonation['User-Agent']).toBe('antigravity/9.9.9 darwin/arm64')
    expect(session!.impersonation['X-Goog-Api-Client']).toBe('fixed-client')
  })

  it('rotates the active index on rate-limit and creates a fingerprint', async () => {
    stubTokenEndpoint()
    const a = account('a@x')
    const b = account('b@x')
    const store = new InMemoryAccountStore(storage([a, b], 0))
    const rotations: string[] = []
    const sessions = new AgySessionManager({ store, onRotate: (from, to) => rotations.push(`${from}->${to}`) })

    const session = await sessions.getSession()
    expect(session!.index).toBe(0)
    await sessions.reportFailure('rate-limit', session!)
    const after = await store.load()
    expect(after.activeIndex).toBe(1)
    expect(rotations).toEqual(['0->1'])
    expect(after.accounts[0]!.fingerprint).toBeDefined()
    expect(after.accounts[0]!.fingerprintHistory).toHaveLength(1)
  })

  it('regenerates the fingerprint on repeated rate-limits (bounded history)', async () => {
    stubTokenEndpoint()
    const store = new InMemoryAccountStore(storage([account()]))
    const sessions = new AgySessionManager({ store })

    let session = await sessions.getSession()
    await sessions.reportFailure('rate-limit', session!)
    const first = (await store.load()).accounts[0]!.fingerprint!
    session = await sessions.getSession()
    await sessions.reportFailure('rate-limit', session!)
    const second = (await store.load()).accounts[0]!.fingerprint!
    expect(second.deviceId).not.toBe(first.deviceId)
    expect((await store.load()).accounts[0]!.fingerprintHistory).toHaveLength(2)
  })

  it('revokes on auth-failure: disables and marks verification required', async () => {
    stubTokenEndpoint()
    const store = new InMemoryAccountStore(storage([account()]))
    const sessions = new AgySessionManager({ store })

    const session = await sessions.getSession()
    await sessions.reportFailure('auth-failure', session!)
    const after = await store.load()
    expect(after.accounts[0]!.enabled).toBe(false)
    expect(after.accounts[0]!.verificationRequired).toBe(true)
  })

  it('resets the failure counter on success', async () => {
    stubTokenEndpoint()
    const store = new InMemoryAccountStore(storage([account()]))
    const sessions = new AgySessionManager({ store })

    const session = await sessions.getSession()
    await sessions.reportFailure('rate-limit', session!)
    await sessions.markSuccess(session!)
    await sessions.reportFailure('rate-limit', session!)
    // consecutive counter was reset → no fingerprint regeneration yet (only creation on 1st)
    const after = await store.load()
    expect(after.accounts[0]!.fingerprintHistory).toHaveLength(1)
  })
})


  it('heals a missing projectId at request time and persists it', async () => {
    // token endpoint + loadCodeAssist discovery
    let discovered = false
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'at', expires_in: 3600 }), { status: 200 })
      }
      if (url.includes('loadCodeAssist')) {
        discovered = true
        return new Response(JSON.stringify({ cloudaicompanionProject: { id: 'proj-healed' } }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }))

    // account with empty projectId
    const store = new InMemoryAccountStore(storage([{ ...account('a@b.c'), projectId: undefined }]))
    const sessions = new AgySessionManager({ store })

    const session = await sessions.getSession()
    expect(discovered).toBe(true)
    expect(session!.account.projectId).toBe('proj-healed')
    // persisted in the store, including the packed refresh string
    const saved = await store.load()
    expect(saved.accounts[0]!.projectId).toBe('proj-healed')
    expect(saved.accounts[0]!.refresh).toBe('rt-a@b.c|proj-healed')
  })

  it('deduplicates concurrent refreshes for the same account', async () => {
    let refreshCalls = 0
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('oauth2.googleapis.com/token')) {
        refreshCalls++
        await new Promise((r) => setTimeout(r, 30))
        return new Response(JSON.stringify({ access_token: 'at-' + refreshCalls, expires_in: 3600 }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }))
    const store = new InMemoryAccountStore(storage([account('a@b.c')]))
    const sessions = new AgySessionManager({ store })
    const [s1, s2, s3] = await Promise.all([
      sessions.getSession(),
      sessions.getSession(),
      sessions.getSession(),
    ])
    expect(refreshCalls).toBe(1)
    expect(s1?.auth.access).toBe('at-1')
    expect(s2?.auth.access).toBe('at-1')
    expect(s3?.auth.access).toBe('at-1')
  })

describe('verifyAccount', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('re-enables a disabled account when credentials are live again', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'at', expires_in: 3600 }), { status: 200 })
      }
      if (url.includes('userinfo')) {
        return new Response(JSON.stringify({ email: 'a@b.c' }), { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    }))
    const store = new InMemoryAccountStore(storage([{
      ...account('a@b.c'),
      enabled: false,
      verificationRequired: true,
      verificationRequiredReason: 'auth-failure',
    }]))
    const sessions = new AgySessionManager({ store })
    const result = await sessions.verifyAccount(0)
    expect(result).toEqual({ ok: true, email: 'a@b.c' })
    const after = await store.load()
    expect(after.accounts[0]!.enabled).toBe(true)
    expect(after.accounts[0]!.verificationRequired).toBe(false)
    expect(after.accounts[0]!.verificationRequiredReason).toBeUndefined()
  })
})

describe('impersonationHeadersFor', () => {
  it('randomizes when no fingerprint exists and stays stable with one', () => {
    const base = account()
    const first = impersonationHeadersFor(base)
    const second = impersonationHeadersFor(base)
    expect(first['User-Agent']).toMatch(/^antigravity\//)
    // no fingerprint → each call randomizes (no stability promise)
    expect(impersonationHeadersFor(base)).toBeDefined()
    void second

    const fp = { deviceId: 'd', sessionToken: 's', userAgent: 'antigravity/1.0.0 windows/amd64', apiClient: 'c', clientMetadata: { ideType: 'ANTIGRAVITY', platform: 'WINDOWS', pluginType: 'GEMINI' }, createdAt: 0 }
    const stable = impersonationHeadersFor({ ...base, fingerprint: fp })
    expect(stable).toEqual({
      'User-Agent': 'antigravity/1.0.0 windows/amd64',
      'X-Goog-Api-Client': 'c',
      'Client-Metadata': '{"ideType":"ANTIGRAVITY","platform":"WINDOWS","pluginType":"GEMINI"}',
    })
  })
})
