import { describe, it, expect, vi, afterEach } from 'vitest'
import { importManySources } from '../src/cli/import.ts'
import { InMemoryAccountStore } from '../src/store/accounts.ts'
import { encodeCredentialBlob } from '../src/oauth/blob.ts'

/** Stub the enrich calls (userinfo + loadCodeAssist) so tests never touch the network.
 * userinfo maps the Bearer access token to an email so distinct accounts stay distinct. */
function stubEnrichNetwork(emailByToken: Record<string, string>, project = 'proj'): void {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { headers?: Record<string, string> }) => {
    if (url.includes('oauth2/v1/userinfo')) {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? ''
      const email = emailByToken[auth.replace('Bearer ', '')] ?? 'unknown@x.y'
      return { ok: true, json: async () => ({ email }) }
    }
    if (url.includes('loadCodeAssist')) {
      return { ok: true, json: async () => ({ cloudaicompanionProject: { id: project } }) }
    }
    return { ok: false, json: async () => ({}) }
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const validJson = (email: string) => ({
  token: {
    access_token: 'access-' + email,
    refresh_token: 'refresh-' + email,
    expiry: '2099-01-01T00:00:00Z',
    token_type: 'Bearer',
  },
  auth_method: 'oauth',
})

describe('importManySources', () => {
  it('imports multiple json sources and reports per-item errors', async () => {
    stubEnrichNetwork({ 'access-a@x.y': 'a@x.y', 'access-b@x.y': 'b@x.y' })
    const store = new InMemoryAccountStore()

    const result = await importManySources([
      { source: validJson('a@x.y'), kind: 'json' },
      { source: validJson('b@x.y'), kind: 'json' },
      { source: { token: { access_token: 'x' } }, kind: 'json' }, // missing refresh_token
    ], store)

    expect(result.imported).toBe(2)
    expect(result.replaced).toBe(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/refresh_token/)

    const storage = await store.load()
    expect(storage.accounts).toHaveLength(2)
    expect(storage.accounts.map((a) => a.email).sort()).toEqual(['a@x.y', 'b@x.y'])
  })

  it('imports credential blobs alongside json', async () => {
    stubEnrichNetwork({ 'access-c': 'c@x.y', 'access-d@x.y': 'd@x.y' })
    const store = new InMemoryAccountStore()
    const blob = encodeCredentialBlob('agy', {
      access_token: 'access-c',
      refresh_token: 'refresh-c',
      expires_in: 3600,
    })

    const result = await importManySources([
      { source: blob, kind: 'blob' },
      { source: validJson('d@x.y'), kind: 'json' },
    ], store)

    expect(result.imported).toBe(2)
    expect(result.errors).toHaveLength(0)
    const storage = await store.load()
    expect(storage.accounts.map((a) => a.email).sort()).toEqual(['c@x.y', 'd@x.y'])
  })

  it('replaces existing accounts with overwriteExisting', async () => {
    stubEnrichNetwork({ 'access-a@x.y': 'a@x.y' })
    const store = new InMemoryAccountStore()

    await importManySources([{ source: validJson('a@x.y'), kind: 'json' }], store)
    const second = await importManySources(
      [{ source: validJson('a@x.y'), kind: 'json' }],
      store,
      { overwriteExisting: true },
    )

    expect(second.imported).toBe(0)
    expect(second.replaced).toBe(1)
    const storage = await store.load()
    expect(storage.accounts).toHaveLength(1)
  })
})
