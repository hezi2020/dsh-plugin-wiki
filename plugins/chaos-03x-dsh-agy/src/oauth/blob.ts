/**
 * Paste-safe credential blob codec for remote login.
 *
 * Google's `firstparty/nativeapp` consent for this embedded client only releases
 * the authorization code when the loopback redirect is reachable, which never
 * happens on a remote host. A local helper (the `dsh-agy login --remote` path)
 * runs the OAuth on the user's own machine, encodes the raw token response into
 * a single-line blob with this codec, and the remote harness decodes it.
 *
 * Format: `dsh-agy-cred-v1.` + base64url(JSON{v, provider, tokens}) — URL/shell
 * safe, survives copy-paste through terminals.
 */

export const CREDENTIAL_BLOB_PREFIX = 'dsh-agy-cred-v1.'

const CREDENTIAL_BLOB_VERSION = 1

/** Provider this blob codec accepts (bound at decode time to prevent replay across providers). */
export const CREDENTIAL_BLOB_PROVIDER = 'agy'

export interface CredentialBlobTokens {
  access_token?: string
  refresh_token?: string
  id_token?: string
  expires_in?: number
  scope?: string
  [key: string]: unknown
}

export interface CredentialBlob {
  provider: string
  tokens: CredentialBlobTokens
}

/** Encode a provider + raw OAuth token response into a single-line blob. */
export function encodeCredentialBlob(provider: string, tokens: CredentialBlobTokens): string {
  if (!provider || !provider.trim()) {
    throw new Error('encodeCredentialBlob: a non-empty provider is required')
  }
  if (!tokens || typeof tokens !== 'object' || !tokens.access_token) {
    throw new Error('encodeCredentialBlob: tokens with an access_token are required')
  }
  const payload = { v: CREDENTIAL_BLOB_VERSION, provider: provider.trim(), tokens }
  const json = JSON.stringify(payload)
  return `${CREDENTIAL_BLOB_PREFIX}${Buffer.from(json, 'utf8').toString('base64url')}`
}

/**
 * Decode and validate a credential blob. Throws on wrong prefix, malformed
 * payload, version mismatch, provider mismatch, or missing access_token.
 */
export function decodeCredentialBlob(blob: string): CredentialBlob {
  if (typeof blob !== 'string' || !blob.startsWith(CREDENTIAL_BLOB_PREFIX)) {
    throw new Error(`decodeCredentialBlob: invalid format — must start with "${CREDENTIAL_BLOB_PREFIX}"`)
  }
  const b64 = blob.slice(CREDENTIAL_BLOB_PREFIX.length).trim()
  if (!/^[A-Za-z0-9_-]+$/.test(b64)) {
    throw new Error('decodeCredentialBlob: invalid payload — not base64url')
  }

  let parsed: { v?: unknown; provider?: unknown; tokens?: unknown }
  try {
    parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as typeof parsed
  } catch {
    throw new Error('decodeCredentialBlob: payload is not valid JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('decodeCredentialBlob: payload is not an object')
  }
  if (parsed.v !== CREDENTIAL_BLOB_VERSION) {
    throw new Error(`decodeCredentialBlob: unsupported blob version ${String(parsed.v)}`)
  }
  if (parsed.provider !== CREDENTIAL_BLOB_PROVIDER) {
    throw new Error(
      `decodeCredentialBlob: provider mismatch — blob is for "${String(parsed.provider)}" but this plugin serves "${CREDENTIAL_BLOB_PROVIDER}"`,
    )
  }
  const tokens = parsed.tokens
  if (!tokens || typeof tokens !== 'object') {
    throw new Error('decodeCredentialBlob: tokens are missing')
  }
  if (typeof (tokens as CredentialBlobTokens).access_token !== 'string') {
    throw new Error('decodeCredentialBlob: access_token is missing')
  }

  return { provider: parsed.provider, tokens: tokens as CredentialBlobTokens }
}
