/**
 * Fresh Antigravity client version resolution: fetch from the product's own
 * release feeds (6h TTL, single in-flight dedupe), falling back to the pinned
 * pool. Keeps fingerprint User-Agent version strings current — a stale version
 * is the most detectable fingerprint anomaly.
 */

import { AGY_VERSION_FALLBACK } from '../oauth/constants.ts'

const VERSION_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const VERSION_FETCH_TIMEOUT_MS = 5_000

/** Source 1: Antigravity IDE auto-update release feed (array of {version}). */
const IDE_RELEASE_FEED_URL = 'https://antigravity-auto-updater-974169037036.us-central1.run.app/releases'
/** Source 2: agy CLI GitHub releases (object with tag_name). */
const CLI_RELEASE_URL = 'https://api.github.com/repos/google-antigravity/antigravity-cli/releases/latest'

export interface FetchLike {
  (input: string | URL, init?: RequestInit): Promise<Response>
}

export interface VersionState {
  cache?: { version: string; fetchedAt: number }
  inFlight: Promise<string> | null
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number(n) || 0)
  const pb = b.split('.').map((n) => Number(n) || 0)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function pickNewestVersion(...versions: Array<unknown>): string | null {
  const valid = versions
    .filter((v): v is string => typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v))
  if (valid.length === 0) return null
  return valid.reduce<string | null>((best, v) => (!best || compareSemver(v, best) > 0 ? v : best), null)
}

function parseIdeReleaseFeed(payload: unknown): string | null {
  if (!Array.isArray(payload)) return null
  return pickNewestVersion(...payload.map((entry) => (entry as { version?: unknown })?.version))
}

function parseCliRelease(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const release = payload as { name?: unknown; tag_name?: unknown }
  return pickNewestVersion(release.tag_name ?? release.name)
}

async function fetchJsonWithTimeout(fetchImpl: FetchLike, url: string): Promise<unknown> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), VERSION_FETCH_TIMEOUT_MS)
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'dsh-agy/0.1' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Version source ${url} returned ${response.status}`)
    return response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

async function resolveProductVersion(
  state: VersionState,
  fallback: string,
  sourceUrl: string,
  parse: (payload: unknown) => string | null,
  fetchImpl: FetchLike,
): Promise<string> {
  const now = Date.now()
  if (state.cache && now - state.cache.fetchedAt < VERSION_CACHE_TTL_MS) {
    return pickNewestVersion(state.cache.version, fallback) ?? fallback
  }
  if (state.inFlight) return state.inFlight

  state.inFlight = (async () => {
    let resolved: string | null = null
    try {
      resolved = parse(await fetchJsonWithTimeout(fetchImpl, sourceUrl))
    } catch {
      resolved = null
    }
    const version = pickNewestVersion(resolved, state.cache?.version, fallback) ?? fallback
    if (resolved) state.cache = { version, fetchedAt: Date.now() }
    return version
  })()

  try {
    return await state.inFlight
  } finally {
    state.inFlight = null
  }
}

/** Resolve the newest known Antigravity version from the IDE feed. */
export function resolveAntigravityIdeVersion(fetchImpl: FetchLike = fetch): Promise<string> {
  return resolveProductVersion(ideState, AGY_VERSION_FALLBACK, IDE_RELEASE_FEED_URL, parseIdeReleaseFeed, fetchImpl)
}

/** Resolve the newest known Antigravity version from the CLI releases. */
export function resolveAntigravityCliVersion(fetchImpl: FetchLike = fetch): Promise<string> {
  return resolveProductVersion(cliState, AGY_VERSION_FALLBACK, CLI_RELEASE_URL, parseCliRelease, fetchImpl)
}

/** Best available version: newest of both sources, cached 6h. */
export async function resolveAntigravityVersion(fetchImpl: FetchLike = fetch): Promise<string> {
  const [ide, cli] = await Promise.all([resolveAntigravityIdeVersion(fetchImpl), resolveAntigravityCliVersion(fetchImpl)])
  return pickNewestVersion(ide, cli) ?? AGY_VERSION_FALLBACK
}

/**
 * Bounded resolve for fingerprint generation: never block the failure path on
 * cold version feeds. Resolves undefined on timeout/error so callers fall
 * back to the pinned version pool; the abandoned fetch keeps running and
 * populates the 6h cache for later calls.
 */
export async function resolveAntigravityVersionBounded(timeoutMs = 750): Promise<string | undefined> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      resolveAntigravityVersion().catch(() => undefined),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/** Synchronously peek at a fresh cached version (no network). */
export function peekCachedAntigravityVersion(): string | undefined {
  const now = Date.now()
  for (const state of [ideState, cliState]) {
    if (state.cache && now - state.cache.fetchedAt < VERSION_CACHE_TTL_MS) {
      return state.cache.version
    }
  }
  return undefined
}

const ideState: VersionState = { inFlight: null }
const cliState: VersionState = { inFlight: null }
