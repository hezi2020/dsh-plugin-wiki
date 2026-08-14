/**
 * Gemini thought-signature cache for Antigravity tool calls.
 *
 * The Antigravity backend requires every outbound `functionCall` part to carry
 * a `thoughtSignature` (400 "Function call is missing a thought_signature"
 * otherwise). Signatures arrive on the *response* side — as a sibling field of
 * functionCall parts, and on thought parts — and must be replayed on the next
 * turn for the same tool call id. When nothing is cached, the translator
 * injects the `skip_thought_signature_validator` sentinel (the established
 * bypass both reference implementations use by default).
 *
 * Process-local with TTL; a cold process falls back to the sentinel, which the
 * upstream accepts, so cross-process persistence is not required for
 * correctness.
 */

export const THOUGHT_SIGNATURE_SENTINEL = 'skip_thought_signature_validator'

interface CacheEntry {
  signature: string
  expiresAt: number
}

const DEFAULT_TTL_MS = 60 * 60 * 1000
const MAX_ENTRIES = 2000

const store = new Map<string, CacheEntry>()

function pruneExpired(now = Date.now()): void {
  if (store.size < MAX_ENTRIES / 2) return
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key)
  }
}

/** Store the signature observed for one tool call id (response side). */
export function setThoughtSignature(toolCallId: string, signature: string, ttlMs = DEFAULT_TTL_MS): void {
  if (!toolCallId || !signature) return
  pruneExpired()
  if (store.size >= MAX_ENTRIES) {
    // Evict the oldest entry to keep the cache bounded.
    let oldestKey: string | null = null
    let oldestExpiry = Infinity
    for (const [key, entry] of store) {
      if (entry.expiresAt < oldestExpiry) {
        oldestExpiry = entry.expiresAt
        oldestKey = key
      }
    }
    if (oldestKey) store.delete(oldestKey)
  }
  store.set(toolCallId, { signature, expiresAt: Date.now() + ttlMs })
}

/** Resolve the signature for one tool call id, or null when unknown/expired. */
export function getThoughtSignature(toolCallId: string): string | null {
  if (!toolCallId) return null
  const entry = store.get(toolCallId)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    store.delete(toolCallId)
    return null
  }
  return entry.signature
}
