/**
 * Antigravity request/session identity generation (mirrors the active
 * OmniRoute implementation; the archived reference stopped maintaining these).
 */

import { randomBytes } from 'node:crypto'

/** One request id per upstream call: `agent/<epoch>/<8 hex>`. */
export function generateAntigravityRequestId(): string {
  return `agent/${Date.now()}/${randomBytes(4).toString('hex')}`
}

/**
 * Uniformly random session id in `-{0..9e18}` via rejection sampling (avoids
 * modulo bias). The negative numeric shape matches what the backend issues.
 */
export function generateAntigravitySessionId(): string {
  const max = 18_446_744_073_709_551_615n // 2^64 - 1
  const target = 9_000_000_000_000_000_000n
  const limit = max - (max % target)
  let value: bigint
  do {
    value = randomBytes(8).readBigUInt64BE()
  } while (value >= limit)
  return `-${(value % target).toString()}`
}

const FNV_OFFSET_I64 = -3_750_763_044_362_895_579n
const FNV_PRIME_I64 = 1_099_511_628_211n

/** 64-bit FNV-1a hash of a string (stable across processes). */
export function fnv1a64(input: string): bigint {
  let hash = FNV_OFFSET_I64
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i))
    hash = BigInt.asIntN(64, hash * FNV_PRIME_I64)
  }
  return hash
}

/**
 * Stable per-account session id: same account always derives the same id, so
 * multi-turn context caching keys consistently; unknown accounts get a fresh
 * random id.
 */
export function deriveAntigravitySessionId(accountKey: string | null | undefined): string | null {
  if (!accountKey || accountKey.trim().length === 0) return null
  const hash = fnv1a64(accountKey.trim())
  // Fold into the positive 9e18 range the backend accepts.
  const target = 9_000_000_000_000_000_000n
  const folded = hash < 0n ? -hash : hash
  return `-${(folded % target).toString()}`
}
