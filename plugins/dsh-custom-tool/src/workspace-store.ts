/**
 * Per-workspace tool store: one JSON file per workspace under the harness
 * home, keyed by the canonical (realpath) workspace root. Workspace-location
 * tools live here; global-location tools live in the settings namespace.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import type { CustomTool } from './types.ts'

const STORE_VERSION = 1

interface WorkspaceStoreEnvelope {
  version: number
  tools: CustomTool[]
}

/**
 * Resolve the harness home the store directories live under.
 * @param configHome - the configured home; empty falls back to $DSH_HOME then ~/.dsh.
 * @returns the resolved home path.
 */
export function resolveDshHome(configHome: string): string {
  if (configHome !== '') return resolve(configHome)
  if (process.env.DSH_HOME !== undefined && process.env.DSH_HOME !== '') return resolve(process.env.DSH_HOME)
  return join(homedir(), '.dsh')
}

/**
 * Store file for one workspace, under <dsh home>/workspace-tools/.
 * @param dshHome - the resolved harness home.
 * @param workspaceRoot - the canonical workspace root.
 * @returns the store file path.
 */
export function workspaceStorePath(dshHome: string, workspaceRoot: string): string {
  const digest = createHash('sha256').update(resolve(workspaceRoot)).digest('hex').slice(0, 16)
  return join(dshHome, 'workspace-tools', digest + '.json')
}

/**
 * Read one workspace's tools; a missing store reads as empty.
 * @param dshHome - the resolved harness home.
 * @param workspaceRoot - the canonical workspace root.
 * @returns the stored tools.
 * @throws when the file exists but is not a valid store envelope.
 */
export function readWorkspaceTools(dshHome: string, workspaceRoot: string): CustomTool[] {
  const path = workspaceStorePath(dshHome, workspaceRoot)
  if (!existsSync(path)) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error('corrupt workspace tool store ' + path + ': ' + message)
  }
  const envelope = parsed as Partial<WorkspaceStoreEnvelope>
  if (envelope.version !== STORE_VERSION || !Array.isArray(envelope.tools)) {
    throw new Error('corrupt workspace tool store ' + path + ': not a version-' + STORE_VERSION + ' envelope')
  }
  return envelope.tools
}

/**
 * Atomically write one workspace's tools (temp file + rename).
 * @param dshHome - the resolved harness home.
 * @param workspaceRoot - the canonical workspace root.
 * @param tools - the complete next tool list.
 */
export function writeWorkspaceTools(dshHome: string, workspaceRoot: string, tools: CustomTool[]): void {
  const path = workspaceStorePath(dshHome, workspaceRoot)
  mkdirSync(dirname(path), { recursive: true })
  const envelope: WorkspaceStoreEnvelope = { version: STORE_VERSION, tools }
  const temp = path + '.tmp-' + process.pid
  writeFileSync(temp, JSON.stringify(envelope, null, 2) + '\n', 'utf8')
  renameSync(temp, path)
}

