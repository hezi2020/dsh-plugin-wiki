/**
 * Rotation state machine: decides retry / cool / rotate / revoke for one failed
 * attempt, with tiered backoff and soft-quota pre-checks.
 */

import type { CachedQuota, FailureKind, ManagedAccount, RotationAction } from '../types.ts'
import type { RateLimitCategory } from './classify.ts'

export const BACKOFF_TIERS_MS = [5_000, 10_000, 20_000, 30_000, 60_000] as const

/** Below this remaining fraction the account is treated as soft-quota-exhausted. */
export const SOFT_QUOTA_THRESHOLD = 0.15

export const MAX_ACCOUNTS = 10

function backoffFor(consecutiveFailures: number, maxJitterMs = 1_000): number {
  const index = Math.min(Math.max(consecutiveFailures, 0), BACKOFF_TIERS_MS.length - 1)
  const base = BACKOFF_TIERS_MS[index] ?? BACKOFF_TIERS_MS[BACKOFF_TIERS_MS.length - 1]!
  return base + Math.floor(Math.random() * maxJitterMs)
}

/** Whether the account's cached quota for a model is below the soft threshold. */
export function isOverSoftQuota(
  account: ManagedAccount,
  model: string | undefined,
  now = Date.now(),
): boolean {
  if (!model) return false
  const cached = account.cachedQuota?.[model]
  if (!cached || typeof cached.remainingFraction !== 'number') return false
  if (cached.resetTime && Date.parse(cached.resetTime) <= now) return false
  return cached.remainingFraction < SOFT_QUOTA_THRESHOLD
}

/** Whether the account is currently in a cooldown window. */
export function isCoolingDown(account: ManagedAccount, now = Date.now()): boolean {
  return (account.coolingDownUntil ?? 0) > now
}

/** Whether any model rate limit on the account is still active. */
export function isRateLimited(account: ManagedAccount, now = Date.now()): boolean {
  const times = account.rateLimitResetTimes ?? {}
  return Object.values(times).some((reset) => typeof reset === 'number' && reset > now)
}

/** Record a rate-limit reset for one model key. */
export function recordRateLimit(account: ManagedAccount, modelKey: string, resetAtMs: number): void {
  account.rateLimitResetTimes = { ...(account.rateLimitResetTimes ?? {}), [modelKey]: resetAtMs }
}

/** Clear expired rate limits and cooldowns in place. */
export function clearExpiredState(account: ManagedAccount, now = Date.now()): void {
  if (account.rateLimitResetTimes) {
    const fresh = Object.fromEntries(
      Object.entries(account.rateLimitResetTimes).filter(([, reset]) => reset > now),
    )
    account.rateLimitResetTimes = Object.keys(fresh).length > 0 ? fresh : undefined
  }
  if (account.coolingDownUntil && account.coolingDownUntil <= now) {
    account.coolingDownUntil = undefined
    account.cooldownReason = undefined
  }
}

/** 24h cooldown for a fully exhausted daily quota (single-account: stop hitting the wall). */
export const FULL_QUOTA_COOLDOWN_MS = 24 * 60 * 60 * 1000
/** 5min cooldown for per-minute rate limits. */
export const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000

/**
 * Decide what to do after one failed attempt.
 * @param kind - classified failure kind.
 * @param category - 429 sub-category when kind is rate-limit.
 * @param account - the account that failed (mutated with cooldown/rate-limit state).
 * @param consecutiveFailures - consecutive failures on this account.
 * @param retryAfterMs - server-provided retry delay when present.
 */
export function decideRotation(
  kind: FailureKind,
  account: ManagedAccount,
  consecutiveFailures: number,
  retryAfterMs?: number,
  category: RateLimitCategory = 'unknown',
): RotationAction {
  const now = Date.now()
  const backoffMs = backoffFor(consecutiveFailures)

  switch (kind) {
    case 'rate-limit': {
      if (category === 'soft_rate_limit') {
        // Transient burst: retry the same account almost immediately.
        return { action: 'retry', backoffMs: Math.min(retryAfterMs ?? backoffMs, 3000) }
      }
      if (category === 'quota_exhausted') {
        // Daily/plan quota gone: long cooldown; a single account just waits.
        account.coolingDownUntil = now + FULL_QUOTA_COOLDOWN_MS
        account.cooldownReason = undefined
        return { action: 'cool', backoffMs: FULL_QUOTA_COOLDOWN_MS }
      }
      const cooldownMs = retryAfterMs ?? RATE_LIMIT_COOLDOWN_MS
      account.coolingDownUntil = now + cooldownMs
      account.cooldownReason = undefined // per-model resets live in rateLimitResetTimes
      return { action: 'rotate', backoffMs }
    }
    case 'auth-failure': {
      // Terminal: account credentials are dead; never auto-recover.
      account.verificationRequired = true
      account.verificationRequiredAt = now
      account.verificationRequiredReason = 'auth-failure'
      account.enabled = false
      return { action: 'revoke' }
    }
    case 'network-error': {
      account.coolingDownUntil = now + backoffMs
      account.cooldownReason = 'network-error'
      return { action: 'rotate', backoffMs }
    }
    case 'project-error': {
      account.coolingDownUntil = now + backoffMs
      account.cooldownReason = 'project-error'
      return { action: 'cool', backoffMs }
    }
    case 'transient': {
      return { action: 'retry', backoffMs }
    }
  }
}

/**
 * Pick the next account index for rotation (round-robin across enabled,
 * non-cooling accounts; falls back to the active one when all are cooling).
 */
export function pickNextAccountIndex(
  accounts: ManagedAccount[],
  currentIndex: number,
  now = Date.now(),
): number {
  if (accounts.length <= 1) return currentIndex
  const enabled = accounts.map((a, i) => ({ account: a, index: i }))
    .filter(({ account, index }) => index !== currentIndex && account.enabled !== false && !isCoolingDown(account, now))
  if (enabled.length === 0) return currentIndex
  // Round-robin: first candidate after current index, else first eligible.
  const after = enabled.find((e) => e.index > currentIndex)
  return (after ?? enabled[0]!)!.index
}

/** Build the soft-quota cache TTL: short when low, long when healthy. */
export function computeSoftQuotaCacheTtlMs(remainingFraction: number | undefined, now = Date.now()): number {
  if (typeof remainingFraction !== 'number') return 10 * 60 * 1000
  if (remainingFraction < SOFT_QUOTA_THRESHOLD) return 60 * 1000
  if (remainingFraction < 0.5) return 5 * 60 * 1000
  return 15 * 60 * 1000
}

export type { CachedQuota }
