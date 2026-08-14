import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CURRENT_STORAGE_VERSION,
  InMemoryAccountStore,
  JsonAccountStore,
  deduplicateAccountsByEmail,
  migrateStorage,
  noopFileLock,
  resolveActiveAccount,
} from '../src/store/accounts.ts'
import { createAesGcmCodec, deriveKey, loadMasterKey, persistMasterKey, type SecretCodec } from '../src/store/keyring.ts'
import type { ManagedAccount } from '../src/types.ts'

const codec: SecretCodec = createAesGcmCodec(deriveKey('test-master-key-000000000000000000000000'))

function account(email: string, refresh = `rt-${email}|proj`): ManagedAccount {
  return {
    email,
    refresh,
    addedAt: Date.now(),
    lastUsed: Date.now(),
  }
}

describe('migrations', () => {
  it('migrates V1 to current version preserving fields', () => {
    const v1 = {
      version: 1 as const,
      activeIndex: 0,
      accounts: [
        {
          email: 'a@b.c',
          refreshToken: 'rt1',
          projectId: 'p1',
          addedAt: 1,
          lastUsed: 2,
          isRateLimited: true,
          rateLimitResetTime: 12345,
        },
      ],
    }
    const migrated = migrateStorage(v1)
    expect(migrated.version).toBe(CURRENT_STORAGE_VERSION)
    expect(migrated.accounts[0]?.email).toBe('a@b.c')
    expect(migrated.accounts[0]?.refresh).toBe('rt1|p1|')
    expect(migrated.accounts[0]?.rateLimitResetTimes).toEqual({ default: 12345 })
  })

  it('rejects unknown versions loudly', () => {
    expect(() => migrateStorage({ version: 99 } as never)).toThrow(/unsupported storage version/)
  })
})

describe('encryption round trip', () => {
  it('encrypts refresh on save and decrypts on load', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-agy-'))
    const file = join(dir, 'agy-accounts.json')
    const store = new JsonAccountStore({ file, codec, lock: noopFileLock })

    await store.mutate((s) => {
      s.accounts.push(account('a@b.c', 'secret-refresh'))
    })

    const raw = readFileSync(file, 'utf8')
    expect(raw).not.toContain('secret-refresh')
    expect(raw).toContain('enc:v1:')

    const loaded = await store.load()
    expect(loaded.accounts[0]?.refresh).toBe('secret-refresh')

    rmSync(dir, { recursive: true, force: true })
  })

  it('round-trips through mutate', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-agy-'))
    const file = join(dir, 'agy-accounts.json')
    const store = new JsonAccountStore({ file, codec, lock: noopFileLock })

    const count = await store.mutate((s) => {
      s.accounts.push(account('x@y.z'))
      return s.accounts.length
    })
    expect(count).toBe(1)
    const reloaded = await store.load()
    expect(reloaded.accounts[0]?.email).toBe('x@y.z')
    rmSync(dir, { recursive: true, force: true })
  })

  // POSIX owner-only enforcement is skipped on win32 by design (keyring.ts);
  // Windows mode bits never report 0600, so the rejection cannot happen there.
  it.skipIf(process.platform === 'win32')('fails loud when the file mode is not 0600', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-agy-'))
    const file = join(dir, 'agy-accounts.json')
    writeFileSync(file, '{"version":4,"accounts":[],"activeIndex":0}\n', { mode: 0o644 })
    const store = new JsonAccountStore({ file, codec, lock: noopFileLock })
    await expect(store.load()).rejects.toThrow(/readable beyond its owner/)
    rmSync(dir, { recursive: true, force: true })
  })

  it('treats missing file as an empty store', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-agy-'))
    const store = new JsonAccountStore({ file: join(dir, 'nope.json'), codec, lock: noopFileLock })
    const storage = await store.load()
    expect(storage.accounts).toEqual([])
    rmSync(dir, { recursive: true, force: true })
  })

  it('mutate works when the file does not exist yet (real lockfile path)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-agy-'))
    const file = join(dir, 'fresh.json')
    const store = new JsonAccountStore({ file, codec }) // real proper-lockfile
    await store.mutate((s) => {
      s.accounts.push(account('first@x'))
    })
    const storage = await store.load()
    expect(storage.accounts[0]?.email).toBe('first@x')
    // file must be owner-only (POSIX only; skipped on win32 by design)
    if (process.platform !== 'win32') {
      const mode = (await import('node:fs')).statSync(file).mode & 0o777
      expect(mode).toBe(0o600)
    }
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('keyring persistMasterKey', () => {
  it('appends the key without touching existing content', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-agy-'))
    const file = join(dir, '.credentials.yaml')
    writeFileSync(file, '# a comment\nSOME_KEY: "existing-value"\n', { mode: 0o600 })
    persistMasterKey(dir, 'mast3r')
    const text = readFileSync(file, 'utf8')
    expect(text).toContain('# a comment')
    expect(text).toContain('SOME_KEY: "existing-value"')
    expect(text).toContain('AGY_MASTER_KEY: "mast3r"')
    expect(loadMasterKey(dir)).toBe('mast3r')
    // refuses to overwrite an existing key
    expect(() => persistMasterKey(dir, 'other')).toThrow(/already exists/)
    rmSync(dir, { recursive: true, force: true })
  })

  it('preserves YAML the minimal reader cannot parse (append-only)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-agy-'))
    const file = join(dir, '.credentials.yaml')
    writeFileSync(file, 'NESTED:\n  inner: value\n', { mode: 0o600 })
    persistMasterKey(dir, 'm')
    const text = readFileSync(file, 'utf8')
    expect(text).toContain('NESTED:')
    expect(text).toContain('  inner: value')
    expect(loadMasterKey(dir)).toBe('m')
    rmSync(dir, { recursive: true, force: true })
  })

  it('creates the document when absent', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-agy-'))
    persistMasterKey(dir, 'k1')
    expect(loadMasterKey(dir)).toBe('k1')
    if (process.platform !== 'win32') {
      const mode = (await import('node:fs')).statSync(join(dir, '.credentials.yaml')).mode & 0o777
      expect(mode).toBe(0o600)
    }
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('in-memory store', () => {
  it('behaves like the file store for pool logic', async () => {
    const store = new InMemoryAccountStore()
    await store.mutate((s) => {
      s.accounts.push(account('a@b.c'))
      s.accounts.push(account('a@b.c', 'rt-dup')) // duplicate email
    })
    const loaded = await store.load()
    expect(deduplicateAccountsByEmail(loaded.accounts)).toHaveLength(1)
    expect(resolveActiveAccount(loaded)?.account.email).toBe('a@b.c')
  })
})

describe('pool helpers', () => {
  it('resolves active account with enabled fallback', () => {
    const storage = {
      version: CURRENT_STORAGE_VERSION as const,
      activeIndex: 0,
      accounts: [
        { ...account('disabled@x'), enabled: false },
        { ...account('ok@x') },
      ],
    }
    const resolved = resolveActiveAccount(storage)
    expect(resolved?.account.email).toBe('ok@x')
    expect(resolved?.index).toBe(1)
  })

  it('returns undefined for an empty pool', () => {
    expect(resolveActiveAccount({ version: CURRENT_STORAGE_VERSION, accounts: [], activeIndex: 0 })).toBeUndefined()
  })
})
