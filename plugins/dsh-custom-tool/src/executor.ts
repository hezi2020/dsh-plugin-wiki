/**
 * Parent half of the custom-tool executor: one worker thread per call with a
 * hard wall-clock budget, heap cap, and abort forwarding. The worker is the
 * security and liveness boundary; see README for the sandbox contract.
 */
import { Worker } from 'node:worker_threads'

/**
 * Worker entry path, valid from the built bundle (lib/index.js → lib/executor-worker.js)
 * and from source tests (src/executor.ts → lib/executor-worker.js); the worker
 * is a build artifact either way.
 */
const WORKER_URL = new URL('../lib/executor-worker.js', import.meta.url)

/** Inputs for one tool execution. */
export interface RunToolCodeOptions {
  timeoutMs: number
  memoryLimitMb: number
  allowNetwork: boolean
  /** 'workspace' additionally grants the confined `fs` capability. */
  scope: 'global' | 'workspace'
  /** Canonical workspace root; required for scope 'workspace'. */
  workspaceRoot?: string
  /** Exposed as the tool body's `env` parameter. */
  env: Record<string, unknown>
  /** Cooperative cancellation from the tool pipeline; aborts the worker. */
  signal?: AbortSignal
}

/** A tool body threw, crashed, or returned a non-JSON value. */
export class ToolCodeError extends Error {
  /** The worker-side stack of the original error, when available. */
  readonly causeStack: string | undefined

  /**
   * @param message - the failure message.
   * @param causeStack - worker-side stack, if the failure carried one.
   */
  constructor(message: string, causeStack?: string) {
    super(message)
    this.name = 'ToolCodeError'
    this.causeStack = causeStack
  }
}

/** The call exceeded its wall-clock budget and the worker was terminated. */
export class ToolTimeoutError extends Error {
  /**
   * @param timeoutMs - the budget that was exceeded.
   */
  constructor(timeoutMs: number) {
    super('custom tool exceeded ' + timeoutMs + ' ms')
    this.name = 'ToolTimeoutError'
  }
}

/**
 * Run one tool body in a fresh worker thread and settle with its JSON value.
 * @param code - the tool function body.
 * @param args - frozen call arguments.
 * @param options - execution budget and environment.
 * @returns the JSON return value, or rejects with a ToolCodeError/ToolTimeoutError.
 */
export function runToolCode(code: string, args: unknown, options: RunToolCodeOptions): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let settled = false
    const worker = new Worker(WORKER_URL, {
      workerData: {
        code,
        args,
        env: options.env,
        allowNetwork: options.allowNetwork,
        scope: options.scope,
        workspaceRoot: options.workspaceRoot ?? null,
        syncTimeoutMs: options.timeoutMs,
      },
      resourceLimits: { maxOldGenerationSizeMb: options.memoryLimitMb },
    })
    const finish = (callback: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', onAbort)
      callback()
    }
    const timer = setTimeout(() => {
      finish(() => {
        void worker.terminate()
        reject(new ToolTimeoutError(options.timeoutMs))
      })
    }, options.timeoutMs)
    const onAbort = (): void => {
      finish(() => {
        void worker.terminate()
        reject(new ToolCodeError('custom tool execution aborted'))
      })
    }
    if (options.signal !== undefined) {
      if (options.signal.aborted) onAbort()
      else options.signal.addEventListener('abort', onAbort, { once: true })
    }
    worker.on('message', (message: unknown) => {
      finish(() => {
        void worker.terminate()
        if (typeof message !== 'object' || message === null || !('ok' in message)) {
          reject(new ToolCodeError('custom tool worker sent a malformed message'))
          return
        }
        const result = message as { ok: boolean; value?: unknown; error?: { name: string; message: string; stack?: string } }
        if (result.ok) resolve(result.value)
        else reject(new ToolCodeError(result.error?.message ?? 'custom tool failed', result.error?.stack))
      })
    })
    worker.on('error', (error) => {
      finish(() => { reject(new ToolCodeError('custom tool worker crashed: ' + error.message, error.stack)) })
    })
    worker.on('exit', (code) => {
      if (settled) return
      finish(() => { reject(new ToolCodeError('custom tool worker exited with code ' + String(code) + ' without a result')) })
    })
  })
}

