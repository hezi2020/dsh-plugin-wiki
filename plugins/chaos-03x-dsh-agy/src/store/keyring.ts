/**
 * Master-key management and AES-256-GCM secret codec for the account store.
 *
 * The master key lives in the DSH credentials document (`~/.dsh/.credentials.yaml`,
 * 0600) under `AGY_MASTER_KEY` so both the in-harness plugin (via
 * `ctx.credentials`) and the standalone `dsh-agy` CLI (direct file read) can
 * encrypt and decrypt the same account store.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { existsSync, mkdirSync, statSync } from 'node:fs'

export const MASTER_KEY_REF = 'AGY_MASTER_KEY'

/** Encrypt/decrypt secrets at rest. */
export interface SecretCodec {
  encrypt(plaintext: string): string
  decrypt(payload: string): string
}

const ENC_PREFIX = 'enc:v1:'

/** AES-256-GCM codec; ciphertext format `enc:v1:<iv-b64>:<tag-b64>:<data-b64>`. */
export function createAesGcmCodec(key: Buffer): SecretCodec {
  if (key.length !== 32) {
    throw new Error(`createAesGcmCodec: master key must be 32 bytes, got ${key.length}`)
  }
  return {
    encrypt(plaintext: string): string {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
      const tag = cipher.getAuthTag()
      return `${ENC_PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${data.toString('base64url')}`
    },
    decrypt(payload: string): string {
      if (!payload.startsWith(ENC_PREFIX)) {
        throw new Error('decrypt: payload is not in encrypted format')
      }
      const [, , ivB64 = '', tagB64 = '', dataB64 = ''] = payload.split(':')
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'))
      decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
      const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()])
      return plain.toString('utf8')
    },
  }
}

/** Derive a 32-byte key from an arbitrary master-key string (SHA-256). */
export function deriveKey(masterKey: string): Buffer {
  return createHash('sha256').update(masterKey, 'utf8').digest()
}

/** Default DSH home (`~/.dsh`), honoring `$DSH_HOME`. */
export function resolveDshHome(): string {
  return process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(homedir(), '.dsh')
}

function homedir(): string {
  return process.env.HOME ?? process.env.USERPROFILE ?? '.'
}

/**
 * Minimal reader for the DSH credentials document: a flat YAML mapping of
 * `KEY: "value"` / `KEY: value` lines. Values are unquoted with JSON-style
 * escaping for double-quoted scalars; anything more complex fails loudly.
 */
export function readCredentialsDocument(file: string): Map<string, string> {
  if (!existsSync(file)) return new Map()
  const entries = new Map<string, string>()
  const text = readFileSync(file, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---')) continue
    const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(trimmed)
    if (!match) continue
    const [, key = '', rawValue = ''] = match
    let value: string
    if (rawValue.startsWith('"')) {
      try {
        value = JSON.parse(rawValue) as string
      } catch {
        throw new Error(`readCredentialsDocument: invalid quoted value for "${key}" in ${file}`)
      }
    } else if (rawValue.startsWith("'")) {
      if (!rawValue.endsWith("'") || rawValue.length < 2) {
        throw new Error(`readCredentialsDocument: unterminated single-quoted value for "${key}" in ${file}`)
      }
      value = rawValue.slice(1, -1).replace(/''/g, "'")
    } else {
      value = rawValue
    }
    if (value.length === 0) continue
    entries.set(key, value)
  }
  return entries
}

/**
 * POSIX owner-only enforcement. Windows mode bits never report 0600 (and
 * chmod is a no-op there), so the check is skipped on win32; the encrypted
 * account file and credentials document remain the only defense-in-depth
 * layer on that platform.
 */
export function assertOwnerOnly(file: string): void {
  if (process.platform === 'win32') return
  const mode = statSync(file).mode & 0o777
  if (mode !== 0o600) {
    throw new Error(
      `dsh-agy: ${file} is readable beyond its owner (mode ${mode.toString(8)}); ` +
        'run "chmod 600" before starting again',
    )
  }
}

/**
 * Load the master key from the DSH credentials document. Returns undefined when
 * the document or the reference is absent.
 */
export function loadMasterKey(dshHome: string): string | undefined {
  const file = join(dshHome, '.credentials.yaml')
  if (!existsSync(file)) return undefined
  assertOwnerOnly(file)
  return readCredentialsDocument(file).get(MASTER_KEY_REF)
}

/**
 * Generate and persist a fresh master key (0600) in the DSH credentials document.
 *
 * Append-only + atomic rename: the DSH credentials service owns this file and
 * preserves comments and the formatting of untouched entries (and may hold
 * YAML constructs this minimal reader cannot parse). Rewriting the whole file
 * from our parsed view would silently drop those; appending keeps them.
 */
export function persistMasterKey(dshHome: string, masterKey: string): void {
  const file = join(dshHome, '.credentials.yaml')
  mkdirSync(dirname(file), { recursive: true })
  const existingText = existsSync(file) ? readFileSync(file, 'utf8') : ''
  if (existingText.length > 0 && readCredentialsDocument(file).has(MASTER_KEY_REF)) {
    throw new Error(`persistMasterKey: ${MASTER_KEY_REF} already exists in ${file}`)
  }
  const entry = `${MASTER_KEY_REF}: ${JSON.stringify(masterKey)}`
  const next = existingText.length > 0 && !existingText.endsWith('\n')
    ? `${existingText}\n${entry}\n`
    : `${existingText}${entry}\n`
  const tmp = `${file}.tmp-masterkey`
  writeFileSync(tmp, next, { mode: 0o600 })
  renameSync(tmp, file)
}

/**
 * Resolve (load or create) the master key for a dsh home, then build the codec.
 * Creating a key writes the credentials document; read-only setups should call
 * {@link loadMasterKey} first and surface a friendly error instead.
 */
export function resolveMasterKeyCodec(dshHome: string): { codec: SecretCodec; created: boolean } {
  let masterKey = loadMasterKey(dshHome)
  let created = false
  if (!masterKey) {
    masterKey = randomBytes(32).toString('hex')
    persistMasterKey(dshHome, masterKey)
    created = true
  }
  return { codec: createAesGcmCodec(deriveKey(masterKey)), created }
}
