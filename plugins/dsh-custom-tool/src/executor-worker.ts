/**
 * Worker half of the custom-tool executor: runs one tool body in a fresh
 * node:vm realm, validates the JSON return value, and posts one result message.
 * Bundled into `lib/executor-worker.js`; never imported by the host thread.
 */
import { parentPort, workerData } from 'node:worker_threads'
import vm from 'node:vm'
import { inspect } from 'node:util'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

/** The parent-provided input for one execution. */
interface WorkerInput {
  code: string
  args: unknown
  env: Record<string, unknown>
  allowNetwork: boolean
  /** 'workspace' tools additionally receive the confined `fs` capability. */
  scope: 'global' | 'workspace'
  /** Canonical workspace root for scope 'workspace'; absent outside a session. */
  workspaceRoot: string | null
  /** vm-level interrupt for synchronous hangs; the parent timer is the authority. */
  syncTimeoutMs: number
}

/**
 * Confine one user path to the workspace root: relative paths resolve from
 * the root, absolute paths must stay inside it, and `..` escapes reject.
 * Lexical confinement — a symlink inside the workspace can still point out;
 * the workspace scope is trusted code, not a security boundary (see README).
 * @param root - the canonical workspace root.
 * @param input - the path the tool code supplied.
 * @returns the confined absolute path, or null when the path escapes.
 */
function confinePath(root: string, input: string): string | null {
  const candidate = resolve(root, input)
  const rel = relative(root, candidate)
  if (rel === '') return root
  if (rel.startsWith('..') || isAbsolute(rel)) return null
  return candidate
}

/** Workspace-scoped file capability exposed as the `fs` global. */
function createWorkspaceFs(root: string): Record<string, unknown> {
  const confined = (input: unknown): string => {
    if (typeof input !== 'string' || input === '') throw new Error('fs: path must be a non-empty string')
    const path = confinePath(root, input)
    if (path === null) throw new Error('fs: path escapes the workspace root: ' + input)
    return path
  }
  return {
    async readFile(input: unknown): Promise<string> {
      return readFile(confined(input), 'utf8')
    },
    async writeFile(input: unknown, content: unknown): Promise<void> {
      const path = confined(input)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, typeof content === 'string' ? content : String(content), 'utf8')
    },
    async list(input: unknown): Promise<Array<{ name: string; type: 'file' | 'directory' | 'other' }>> {
      const dir = confined(typeof input === 'string' && input !== '' ? input : '.')
      const entries = await readdir(dir, { withFileTypes: true })
      return entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
      }))
    },
  }
}

export interface WorkerOk { ok: true; value: unknown }
export interface WorkerFailure { ok: false; error: { name: string; message: string; stack: string | undefined } }

function reportOk(value: unknown): void {
  parentPort!.postMessage({ ok: true, value } satisfies WorkerOk)
}

function reportFailure(error: unknown): void {
  const e = error instanceof Error ? error : new Error(String(error))
  parentPort!.postMessage({ ok: false, error: { name: e.name, message: e.message, stack: e.stack } } satisfies WorkerFailure)
}

function format(values: unknown[]): string {
  return values.map(value => typeof value === 'string' ? value : inspect(value, { depth: 4, breakLength: 120 })).join(' ')
}

/**
 * Build the sandbox realm: fresh vm intrinsics plus the documented allowlist.
 * @param allowNetwork - whether `fetch` forwards to the host network.
 * @returns the contextified sandbox global.
 */
function createSandbox(allowNetwork: boolean, scope: 'global' | 'workspace', workspaceRoot: string | null): vm.Context {
  const logLine = (values: unknown[]): string => '[custom-tool] ' + format(values) + '\n'
  const consoleLike = {
    log: (...values: unknown[]) => { process.stdout.write(logLine(values)) },
    info: (...values: unknown[]) => { process.stdout.write(logLine(values)) },
    warn: (...values: unknown[]) => { process.stderr.write(logLine(values)) },
    error: (...values: unknown[]) => { process.stderr.write(logLine(values)) },
  }
  const blockedFetch = (): Promise<never> => Promise.reject(new Error('network access is disabled for custom tools (allowNetwork=false)'))
  const sandbox: Record<string, unknown> = {
    console: consoleLike,
    fetch: allowNetwork
      ? (input: unknown, init?: unknown) => fetch(input as Parameters<typeof fetch>[0], init as Parameters<typeof fetch>[1])
      : blockedFetch,
    TextEncoder,
    TextDecoder,
    URL,
    URLSearchParams,
    atob,
    btoa,
    structuredClone,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    AbortController,
    AbortSignal,
  }
  if (scope === 'workspace') {
    if (workspaceRoot === null) {
      throw new Error('workspace tool executed outside a session: no workspace root available')
    }
    sandbox.fs = createWorkspaceFs(workspaceRoot)
  }
  return vm.createContext(sandbox, { name: 'dsh-custom-tool-sandbox', codeGeneration: { strings: true, wasm: false } })
}

function main(): void {
  const input = workerData as WorkerInput
  try {
    const sandbox = createSandbox(input.allowNetwork, input.scope, input.workspaceRoot)
    const run = vm.runInContext(
      '(async (args, env) => {\n' + input.code + '\n})',
      sandbox,
      { filename: 'custom-tool.js', timeout: input.syncTimeoutMs },
    ) as (args: unknown, env: Record<string, unknown>) => Promise<unknown>
    void (async () => {
      const value = await run(input.args, input.env)
      if (value === undefined) {
        throw new Error('tool returned undefined; return a JSON value (string, number, boolean, null, array, or object)')
      }
      JSON.stringify(value) // rejects cycles and BigInt with a clean error before postMessage
      reportOk(value)
    })().catch(reportFailure)
  } catch (error) {
    reportFailure(error)
  }
}

main()

