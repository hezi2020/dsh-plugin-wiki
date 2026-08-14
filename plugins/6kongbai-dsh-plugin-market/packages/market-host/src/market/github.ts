/**
 * GitHub repository discovery and manifest reading for the marketplace.
 * Pure HTTP functions with no Cordis dependency; the Host service owns
 * caching and audit, this module only speaks to api.github.com.
 *
 * Discovery uses the community `dsh-plugin` topic as the registry: every
 * repository tagged `dsh-plugin` is a candidate. Installability is decided by
 * whether the repository's `package.json` declares `dsh.bundle.patch`.
 * @module dsh-plugin-market-host/market/github
 */

import type { MarketEntryDetail, MarketRepo, MarketSearchHit } from '../types.ts'

/** The topic every installable plugin repository must carry. */
export const MARKET_TOPIC = 'dsh-plugin'

/** Base URL for the unauthenticated GitHub REST API. */
const API = 'https://api.github.com'

/** Optional `GITHUB_TOKEN` raises the anonymous search rate limit. */
function authHeader(token?: string): Record<string, string> {
  return token === undefined ? {} : { authorization: `Bearer ${token}` }
}

/** Narrow GitHub's non-2xx into a caller-facing error without leaking auth. */
async function request<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { accept: 'application/vnd.github+json', ...authHeader(token) },
  })
  if (!response.ok) {
    const reason = response.status === 429
      ? 'GitHub rate limit exceeded; set GITHUB_TOKEN to raise it'
      : `GitHub returned ${response.status}`
    throw new Error(`plugin-market: ${path}: ${reason}`)
  }
  return response.json() as Promise<T>
}

/** The subset of a repository search result the market surfaces. */
export interface RepoSummary {
  readonly full_name: string
  readonly description: string | null
  readonly stargazers_count: number
  readonly pushed_at: string
  readonly license: { readonly spdx_id?: string } | null
  readonly topics?: readonly string[]
  readonly html_url: string
}

export interface SearchResponse {
  readonly total_count: number
  readonly items: readonly RepoSummary[]
}

/**
 * Search the `dsh-plugin` topic for repositories matching an optional query.
 * @param query - free-text filter; empty matches every tagged repository.
 * @param token - optional GitHub token to raise the search rate limit.
 * @returns entries in GitHub's star order, without installability resolution.
 */
export async function searchRepositories(query: string, token?: string): Promise<SearchResponse> {
  const encoded = encodeURIComponent(query === '' ? `topic:${MARKET_TOPIC}` : `${query} topic:${MARKET_TOPIC}`)
  return request<SearchResponse>(`/search/repositories?q=${encoded}&sort=stars&order=desc&per_page=30`, token)
}

/** The `dsh.market` slice of a plugin's package.json, all optional. */
export interface DshMarketManifest {
  readonly displayName?: string
  readonly icon?: string
  readonly categories?: readonly string[]
}

/** The `dsh` section relevant to installability and presentation. */
interface ManifestDsh {
  readonly bundle?: { readonly patch?: string }
  readonly market?: DshMarketManifest
}

/** The package.json slice the market reads. */
interface ManifestSlice {
  readonly name?: string
  readonly version?: string
  readonly description?: string
  readonly keywords?: readonly string[]
  readonly homepage?: string
  readonly license?: string
  readonly dsh?: ManifestDsh
}

interface ContentsResponse {
  readonly content?: string
  readonly encoding?: string
}

/** Resolve the default branch of a repository. */
async function defaultBranch(repo: MarketRepo, token?: string): Promise<string> {
  const meta = await request<{ readonly default_branch: string }>(`/repos/${repo}`, token)
  return meta.default_branch
}

/** Resolve the latest commit SHA on the repository's default branch. */
async function headCommit(repo: MarketRepo, token?: string): Promise<string> {
  const branch = await defaultBranch(repo, token)
  const ref = await request<{ readonly object: { readonly sha: string } }>(
    `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, token)
  return ref.object.sha
}

/**
 * Resolve the pinned install spec for a repository: `github:owner/repo#<sha>`
 * at the default branch's current head. Pinning the commit, never a floating
 * branch, is the install-time trust boundary — a later force-push cannot move
 * what this install already resolved.
 * @param repo - `owner/repo` slug.
 * @param token - optional GitHub token.
 * @returns the exact pnpm git spec to install.
 */
export async function resolvePinSpec(repo: MarketRepo, token?: string): Promise<string> {
  return `github:${repo}#${await headCommit(repo, token)}`
}

/**
 * Read and decode a repository's root package.json.
 * @returns the parsed manifest slice, or null when the file is absent or unreadable.
 */
export async function readRepositoryManifest(repo: MarketRepo, token?: string): Promise<ManifestSlice | null> {
  const contents = await request<ContentsResponse>(
    `/repos/${repo}/contents/package.json?ref=HEAD`, token)
  if (contents.content === undefined || contents.encoding !== 'base64') return null
  try {
    return JSON.parse(Buffer.from(contents.content, 'base64').toString('utf8')) as ManifestSlice
  } catch {
    return null
  }
}

/** Whether a manifest declares a bundle patch, i.e. it is installable. */
function isInstallable(manifest: ManifestSlice | null): boolean {
  return typeof manifest?.dsh?.bundle?.patch === 'string' && manifest.dsh.bundle.patch.length > 0
}

/** The effective display name: `dsh.market.displayName`, then package name, then repo. */
function displayName(manifest: ManifestSlice | null, repo: MarketRepo): string {
  return manifest?.dsh?.market?.displayName ?? manifest?.name ?? repo
}

/** The effective description: `dsh.market` has none, so use package then repo. */
function description(manifest: ManifestSlice | null, fallback: string): string {
  return manifest?.description ?? fallback
}

/** The effective categories: `dsh.market.categories`, else package keywords. */
function categories(manifest: ManifestSlice | null): readonly string[] {
  return manifest?.dsh?.market?.categories ?? manifest?.keywords ?? []
}

/**
 * Build a lightweight search hit from a GitHub search result. This is a pure
 * mapping of the search metadata — it performs no additional request and does
 * not read the repository manifest, keeping `search` to a single API call.
 * @param summary - the GitHub search result.
 */
export function toHit(summary: RepoSummary): MarketSearchHit {
  return {
    repo: summary.full_name,
    description: summary.description ?? '',
    stars: summary.stargazers_count,
    updatedAt: summary.pushed_at,
    license: summary.license?.spdx_id ?? null,
  }
}

/**
 * Resolve a full detail for one repository.
 * @param repo - `owner/repo` slug.
 * @param summary - the GitHub repo metadata (may be a search hit or fetched).
 * @param manifest - the repository's package.json, or null.
 * @param installed - whether the bundle is already in the target profile.
 * @param token - optional GitHub token.
 * @returns detail including the pinned install spec when installable.
 */
export async function toDetail(
  repo: MarketRepo,
  summary: RepoSummary,
  manifest: ManifestSlice | null,
  installed: boolean,
  token?: string,
): Promise<MarketEntryDetail> {
  const installable = isInstallable(manifest)
  const pinSpec = installable ? `github:${repo}#${await headCommit(repo, token)}` : null
  return {
    repo,
    displayName: displayName(manifest, repo),
    description: description(manifest, summary.description ?? ''),
    version: manifest?.version ?? null,
    stars: summary.stargazers_count,
    updatedAt: summary.pushed_at,
    license: summary.license?.spdx_id ?? null,
    homepage: manifest?.homepage ?? summary.html_url,
    icon: manifest?.dsh?.market?.icon ?? null,
    categories: categories(manifest),
    installable,
    installed,
    pinSpec,
  }
}

/**
 * Fetch a repository's metadata directly (used when it did not come from a
 * search result, e.g. an explicit `info <repo>`).
 */
export async function fetchRepository(repo: MarketRepo, token?: string): Promise<RepoSummary> {
  const meta = await request<{
    readonly full_name: string
    readonly description: string | null
    readonly stargazers_count: number
    readonly pushed_at: string
    readonly license: { readonly spdx_id?: string } | null
    readonly topics?: readonly string[]
    readonly html_url: string
  }>(`/repos/${repo}`, token)
  return meta
}

/** Validate a `owner/repo` slug before it reaches the API or the shell. */
export function isRepoSlug(value: string): value is MarketRepo {
  return /^[\w.-]+\/[\w.-]+$/.test(value) && !value.includes('..')
}
