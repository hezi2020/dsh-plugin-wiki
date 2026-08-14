/** Packed refresh-string helpers and access-token expiry math. */

import type { OAuthAuthDetails, RefreshParts } from '../types.ts'

const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60 * 1000

/** Split the packed refresh string into its constituent refresh token and project ids. */
export function parseRefreshParts(refresh: string): RefreshParts {
  const [refreshToken = '', projectId = '', managedProjectId = ''] = (refresh ?? '').split('|')
  return {
    refreshToken: refreshToken || undefined,
    projectId: projectId || undefined,
    managedProjectId: managedProjectId || undefined,
  }
}

/** Serialize refresh token parts into the stored string format. */
export function formatRefreshParts(parts: RefreshParts): string {
  const projectSegment = parts.projectId ?? ''
  const base = `${parts.refreshToken ?? ''}|${projectSegment}`
  return parts.managedProjectId ? `${base}|${parts.managedProjectId}` : base
}

/** Whether the access token is expired or missing, with a buffer for clock skew. */
export function accessTokenExpired(auth: OAuthAuthDetails): boolean {
  if (!auth.access || typeof auth.expires !== 'number') {
    return true
  }
  return auth.expires <= Date.now() + ACCESS_TOKEN_EXPIRY_BUFFER_MS
}

/** Absolute expiry timestamp from a duration; malformed durations expire immediately. */
export function calculateTokenExpiry(requestTimeMs: number, expiresInSeconds: unknown): number {
  const seconds = typeof expiresInSeconds === 'number' ? expiresInSeconds : 3600
  if (Number.isNaN(seconds) || seconds <= 0) {
    return requestTimeMs
  }
  return requestTimeMs + seconds * 1000
}
