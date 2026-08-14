/**
 * Upstream failure classification: HTTP status + headers + body → FailureKind.
 * Conservative by design: only auth-failure may revoke an account; everything
 * else cools, rotates, or retries.
 */

import type { FailureKind } from '../types.ts'

export interface ClassifiedError {
  kind: FailureKind
  status?: number
  /** Server-provided retry delay (ms), when the response carried it. */
  retryAfterMs?: number
  /** Server-provided absolute reset time, when the response carried it. */
  resetTime?: string
  message?: string
  /** 429 sub-category, present when kind is rate-limit. */
  rateLimitCategory?: RateLimitCategory
}

/**
 * 429 sub-category (mirrors CLIProxyAPI/OmniRoute's classify429):
 * - soft_rate_limit: transient burst, retry immediately on the same account
 * - rate_limited:    per-minute limit, short cooldown then retry (same account
 *                    when there is no other)
 * - quota_exhausted: daily/plan quota gone, long cooldown (24h)
 * - unknown:         exponential backoff
 */
export type RateLimitCategory = 'soft_rate_limit' | 'rate_limited' | 'quota_exhausted' | 'unknown'

const QUOTA_EXHAUSTED_KEYWORDS = [
  'quota_exhausted',
  'quota exhausted',
  'quota reached',
  'enable overages',
  'individual quota',
]

/** Classify a 429 body into the four upstream categories. */
export function classifyRateLimit(
  bodyText: string | undefined,
  retryAfterMs: number | undefined,
): RateLimitCategory {
  const text = (bodyText ?? '').toLowerCase()
  if (QUOTA_EXHAUSTED_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'quota_exhausted'
  }
  if (retryAfterMs !== undefined && retryAfterMs < 3000) {
    return 'soft_rate_limit'
  }
  if (retryAfterMs !== undefined) {
    return 'rate_limited'
  }
  // No explicit retry hint: "quota" wording → daily quota, otherwise unknown.
  return text.includes('quota') || text.includes('resource_exhausted') ? 'quota_exhausted' : 'unknown'
}

const RATE_LIMIT_RESET_FIELDS = ['resetTime', 'reset_time', 'resetAt', 'quotaResetTime'] as const

function extractResetTime(bodyText: string | undefined): string | undefined {
  if (!bodyText) return undefined
  try {
    const data = JSON.parse(bodyText) as Record<string, unknown>
    for (const field of RATE_LIMIT_RESET_FIELDS) {
      const value = data[field]
      if (typeof value === 'string' && value) return value
      if (typeof value === 'number' && Number.isFinite(value)) {
        // Unix ms when large, seconds when small (relative to now).
        return value > 1_000_000_000_000 ? new Date(value).toISOString() : new Date(Date.now() + value * 1000).toISOString()
      }
    }
    const quotaInfo = data.quotaInfo as Record<string, unknown> | undefined
    if (quotaInfo && typeof quotaInfo.resetTime === 'string') return quotaInfo.resetTime
  } catch {
    // not JSON — no reset info
  }
  return undefined
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = Date.parse(header)
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now())
  return undefined
}

/** Classify a completed HTTP response (non-2xx). */
export function classifyHttpError(
  status: number,
  headers: Headers,
  bodyText?: string,
): ClassifiedError {
  const retryAfterMs = parseRetryAfter(headers.get('retry-after'))
  const resetTime = extractResetTime(bodyText)

  if (status === 429) {
    const category = classifyRateLimit(bodyText, retryAfterMs)
    return {
      kind: 'rate-limit',
      rateLimitCategory: category,
      status,
      retryAfterMs,
      resetTime,
      message: bodyText ? bodyText.slice(0, 200) : undefined,
    }
  }
  if (status === 401) {
    return { kind: 'auth-failure', status, message: bodyText ? bodyText.slice(0, 200) : undefined }
  }
  if (status === 403) {
    // Google also reports quota walls as 403 RESOURCE_EXHAUSTED, and the
    // endpoint fallback chain ends on hosts answering 403 for "no license"
    // (not bad auth). Only treat a 403 as auth-failure when the body carries
    // no quota wording — a false revoke permanently disables the account.
    const category = classifyRateLimit(bodyText, undefined)
    if (category === 'quota_exhausted') {
      return {
        kind: 'rate-limit',
        rateLimitCategory: category,
        status,
        message: bodyText ? bodyText.slice(0, 200) : undefined,
      }
    }
    return { kind: 'auth-failure', status, message: bodyText ? bodyText.slice(0, 200) : undefined }
  }
  if (status === 404) {
    // Model/route missing — nothing to rotate for; surface as transient request error.
    return { kind: 'transient', status, message: bodyText ? bodyText.slice(0, 200) : undefined }
  }
  if (status >= 500) {
    return { kind: 'transient', status, retryAfterMs, message: bodyText ? bodyText.slice(0, 200) : undefined }
  }
  // 400-range others: request-level errors, no rotation semantics.
  return { kind: 'transient', status, message: bodyText ? bodyText.slice(0, 200) : undefined }
}

/** Classify a fetch-level failure (DNS, refused, timeout, abort). */
export function classifyFetchError(error: unknown): ClassifiedError {
  const message = error instanceof Error ? error.message : String(error)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { kind: 'network-error', message }
  }
  return { kind: 'network-error', message }
}

/** Classify the result of a refresh attempt (shared by adapter + verify paths). */
export function classifyRefreshFailure(status: number, code?: string): ClassifiedError {
  if (code === 'invalid_grant') return { kind: 'auth-failure', status, message: code }
  if (status === 429) return { kind: 'rate-limit', status, message: code }
  if (status >= 500) return { kind: 'transient', status, message: code }
  return { kind: 'transient', status, message: code }
}

export type { FailureKind }
