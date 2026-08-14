/**
 * Install/uninstall landing for the marketplace: the same reconcile the
 * `dsh plugin` launcher performs, reimplemented here so the out-of-tree Host
 * plugin needs no launcher cooperation. The target profile is the only
 * resolution anchor: every package this module reconciles is a pnpm-managed
 * dependency of that profile, so it resolves from the profile's own
 * `node_modules` (in-box bundles are template layers, not dependencies, and
 * are never touched).
 * @module dsh-plugin-market-host/install
 */

import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  initProfile,
  PROFILE_TEMPLATES,
  DEFAULT_PROFILE_BUNDLES,
  readProfileManifest,
  resolveBundleDir,
  resolveProfileDir,
  writeProfileManifest,
  type ProfileManifest,
} from '@deepseek-ai/dsh-app-boot'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { resolvePinSpec } from './market/github.ts'

const NAME = 'dsh-plugin-market'

/** Absolute path of the market's audit log under the Harness home. */
export function auditLogPath(home: string = resolveDshHome()): string {
  return join(home, 'plugin-install.log')
}

/** One audit record, appended as JSONL on every install/uninstall. */
interface AuditRecord {
  readonly action: 'install' | 'uninstall'
  readonly package: string
  readonly profile: string
  readonly spec?: string
  readonly repo?: string
  readonly time: string
}

/** Append one audit line; never throws (auditing must not fail the install). */
function audit(record: AuditRecord): void {
  try {
    appendFileSync(auditLogPath(), `${JSON.stringify(record)}\n`)
  } catch {
    // A read-only home is survivable; the install itself already reported.
  }
}

/**
 * Resolve a profile directory, initializing a shipped template on first use.
 * @param profile - the profile name (defaults to the caller's choice, never empty).
 * @returns the absolute profile directory.
 */
export function profileDir(profile: string): string {
  const dir = resolveProfileDir(profile)
  if (!existsSync(join(dir, 'package.json'))) {
    initProfile(dir, PROFILE_TEMPLATES[profile] ?? DEFAULT_PROFILE_BUNDLES)
  }
  return dir
}

/**
 * The bundle package names already listed in a profile's `dsh.profile.bundles`.
 * @param profile - the target profile name.
 * @returns the installed bundle names.
 */
export function installedBundleNames(profile: string): readonly string[] {
  const dir = profileDir(profile)
  return readProfileManifest(NAME, dir).dsh?.profile?.bundles ?? []
}

/** Whether a profile dependency resolves to a bundle (`dsh.bundle.patch`). */
function exportsPatch(packageName: string, dir: string): boolean {
  let packageDir: string
  try {
    // The profile is the only anchor: the dependency is pnpm-installed there.
    packageDir = resolveBundleDir(NAME, packageName, join(dir, 'package.json'), dir)
  } catch {
    return false
  }
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as ProfileManifest
  return manifest.dsh?.bundle?.patch !== undefined
}

/**
 * Reconcile `dsh.profile.bundles` against installed dependencies. Mirrors the
 * launcher: a dependency declaring `dsh.bundle` joins the layer list, a
 * removed or bundle-less dependency leaves it. The pre-pnpm dependency set
 * distinguishes a just-removed dependency from an in-box template bundle,
 * which is never a dependency and never touched.
 * @param dir - the profile directory.
 * @param beforeDeps - dependency names present before the pnpm operation.
 */
function reconcile(dir: string, beforeDeps: ReadonlySet<string>): void {
  const manifest = readProfileManifest(NAME, dir)
  const dependencies = Object.keys(manifest.dependencies ?? {})
  const bundles = [...(manifest.dsh?.profile?.bundles ?? [])]
  let changed = false
  const dependencySet = new Set(dependencies)
  for (const packageName of dependencies) {
    if (exportsPatch(packageName, dir) && !bundles.includes(packageName)) {
      bundles.push(packageName)
      changed = true
    }
  }
  for (const packageName of [...bundles]) {
    const wasDependency = beforeDeps.has(packageName) || dependencySet.has(packageName)
    const stillBundle = dependencySet.has(packageName) && exportsPatch(packageName, dir)
    if (wasDependency && !stillBundle) {
      bundles.splice(bundles.indexOf(packageName), 1)
      changed = true
    }
  }
  if (!changed) return
  manifest.dsh = { ...manifest.dsh, profile: { ...manifest.dsh?.profile, bundles } }
  writeProfileManifest(dir, manifest)
}

/** The pnpm package name that actually satisfies a git spec is unknown until
 * install; reconcile resolves it from the profile afterwards. */
function installedPackageName(dir: string, before: readonly string[]): string | null {
  const after = new Set(Object.keys(readProfileManifest(NAME, dir).dependencies ?? {}))
  for (const name of after) {
    if (!before.includes(name)) return name
  }
  return null
}

/**
 * Install one repository into a profile: pin the default-branch head, run
 * `pnpm add`, reconcile, and audit. Returns after pnpm settles; the caller is
 * responsible for the pre-install confirmation and post-install restart note.
 * @param repo - `owner/repo` slug.
 * @param profile - target profile name.
 * @returns the installed package name and pinned spec.
 */
export async function install(repo: string, profile: string): Promise<{ package: string; pinSpec: string }> {
  const dir = profileDir(profile)
  const before = new Set(Object.keys(readProfileManifest(NAME, dir).dependencies ?? {}))
  const pinSpec = await resolvePinSpec(repo)
  const result = spawnSync('pnpm', ['add', pinSpec], {
    cwd: dir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error !== undefined) throw result.error
  if ((result.status ?? 1) !== 0) {
    throw new Error(`${NAME}: pnpm add failed in ${dir} — git plugins build on install; `
      + 'ensure the package is allowlisted under allowBuilds in the profile pnpm-workspace.yaml')
  }
  reconcile(dir, before)
  const packageName = installedPackageName(dir, [...before])
  if (packageName !== null) {
    audit({ action: 'install', package: packageName, profile, spec: pinSpec, repo, time: new Date().toISOString() })
  }
  return { package: packageName ?? '', pinSpec }
}

/**
 * Remove one package from a profile: `pnpm remove`, reconcile, and audit.
 * @param packageName - the npm package name to remove.
 * @param profile - target profile name.
 */
export function uninstall(packageName: string, profile: string): void {
  const dir = profileDir(profile)
  const before = new Set(Object.keys(readProfileManifest(NAME, dir).dependencies ?? {}))
  const result = spawnSync('pnpm', ['remove', packageName], {
    cwd: dir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error !== undefined) throw result.error
  if ((result.status ?? 1) !== 0) {
    throw new Error(`${NAME}: pnpm remove failed in ${dir}`)
  }
  reconcile(dir, before)
  audit({ action: 'uninstall', package: packageName, profile, time: new Date().toISOString() })
}
