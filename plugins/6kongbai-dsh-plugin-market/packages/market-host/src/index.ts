/**
 * Engine for the dsh plugin marketplace: GitHub topic indexing and profile
 * install/uninstall landing. This package is a plain Node library with no
 * Cordis dependency — it is consumed by the CLI and, later, by a Web GUI Host
 * half once Typert supports out-of-tree plugins.
 * @module dsh-plugin-market-host
 */

export type * from './types.ts'

export {
  fetchRepository,
  isRepoSlug,
  readRepositoryManifest,
  resolvePinSpec,
  searchRepositories,
  toDetail,
  toHit,
} from './market/github.ts'
export type {
  DshMarketManifest,
  RepoSummary,
  SearchResponse,
} from './market/github.ts'
export {
  auditLogPath,
  install,
  installedBundleNames,
  profileDir,
  uninstall,
} from './install.ts'
