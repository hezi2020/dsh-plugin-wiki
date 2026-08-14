/**
 * dsh-wiki-entry — permanent Wiki 入口 for the DSH Web UI.
 *
 * Host half: registers the `wiki-entry` settings namespace (the persistent
 * on/off switch, default enabled), webServer routes that probe and start the
 * local wiki static server (`<wikiRoot>/serve.mjs`, port 8099, /wiki prefix),
 * and auto-starts the server on activation while enabled. The wiki server is
 * spawned through the host-scoped subprocess service, so it keeps serving
 * after this plugin is stopped or reloaded — the entry is "always available"
 * while the harness runs.
 *
 * Install (bundle): `dsh plugin --profile web add <this package>` (local path
 * or npm name). The bundle patch mounts this row into the host composition;
 * the package's `dsh.client` declaration makes the browser half part of the
 * Web boot graph on every page load.
 *
 * @module dsh-wiki-entry
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Declaration merge only: makes ctx.settings visible.
import type {} from '@deepseek-ai/dsh-settings'
import type { SubprocessHandle, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { connect } from 'node:net'
import { join, resolve } from 'node:path'

/** Settings namespace of this plugin: the persistent enable switch. */
const WIKI_NS = 'wiki-entry'

/** Schema of the `wiki-entry` settings section. */
const WIKI_SETTINGS = z.object({
  /** Whether the Wiki entry (and its server) is enabled. Persisted in settings.yaml. */
  enabled: z.boolean().default(true),
})

/** Structural slice of the web server service (route registration shape). */
interface WebRouteHost {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  }): () => void
}

/** Structural slice of the subprocess service (spawn + terminate + done). */
interface SubprocessHost {
  spawn(spec: SubprocessSpawnSpec): SubprocessHandle
}

export const name = 'wiki-entry'

/** Plugin configuration. */
export interface Config {
  /** Root of the wiki checkout; the static site lives at <root>/site. */
  wikiRoot?: string
  /** Port the wiki server listens on (default 8099). */
  port?: number
  /** URL prefix the site is served under (default /wiki). */
  prefix?: string
}

export const Config: z<Config> = z.object({
  wikiRoot: z.string().default('./wiki'),
  port: z.natural().default(8099),
  prefix: z.string().default('/wiki'),
})

/** Host plugin body: settings namespace, web routes, and server lifecycle. */
export function apply(ctx: Context, config: Config): void {
  const root = resolve(config.wikiRoot ?? './wiki')
  const port = config.port ?? 8099
  const prefix = config.prefix ?? '/wiki'
  const url = `http://127.0.0.1:${port}${prefix}/`
  const serverScript = join(root, 'serve.mjs')

  // --- Persistent enable switch -------------------------------------------
  // Settings registration is lazy and retried on every service binding: the
  // row may activate before (or in a hot-mount before) the settings provider
  // publishes its service, and registration must not be skipped silently.
  let enabled = true
  let settingsRegistered = false
  const registerSettings = (): void => {
    if (settingsRegistered) return
    const settings = ctx.get('settings') as {
      register(ns: string, schema: z<unknown>): {
        get(): { enabled: boolean }
        watch(cb: (next: { enabled: boolean }, prev: { enabled: boolean }) => void): () => void
      }
    } | undefined
    if (settings === undefined) return
    const scope = settings.register(WIKI_NS, WIKI_SETTINGS as unknown as z<unknown>)
    settingsRegistered = true
    enabled = scope.get().enabled
    scope.watch((next) => {
      enabled = next.enabled
      if (!enabled) {
        stopServer()
      } else {
        void ensureRunning()
      }
    })
  }

  // --- Wiki server lifecycle ----------------------------------------------
  let spawned: SubprocessHandle | undefined

  const stopServer = (): void => {
    if (spawned === undefined) return
    spawned.terminate()
    spawned = undefined
  }

  /** Probe whether the wiki port is already answering. */
  const probe = (): Promise<boolean> => new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port })
    const done = (ok: boolean): void => { socket.destroy(); resolve(ok) }
    socket.setTimeout(1000, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })

  /**
   * Ensure the wiki server is up: probe, spawn `node serve.mjs` through the
   * host-scoped subprocess service, and poll until the port answers.
   * @returns whether the server is reachable, and whether this call started it.
   */
  const ensureRunning = async (): Promise<{ ok: boolean; started: boolean; error?: string }> => {
    if (await probe()) return { ok: true, started: false }
    const subprocess = ctx.get('subprocess') as SubprocessHost | undefined
    if (subprocess === undefined) {
      return { ok: false, started: false, error: 'subprocess service is unavailable' }
    }
    if (spawned === undefined) {
      spawned = subprocess.spawn({
        argv: ['node', serverScript],
        cwd: root,
        stdio: { stdin: 'ignore', stdout: { maxBytes: 8192 }, stderr: { maxBytes: 8192 } },
        graceMs: 5000,
      })
      spawned.done.then(() => { spawned = undefined }, () => { spawned = undefined })
    }
    for (let attempt = 0; attempt < 40; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 250))
      if (await probe()) return { ok: true, started: true }
    }
    return { ok: false, started: false, error: 'wiki server did not become ready within 10s' }
  }

  // --- webServer routes ----------------------------------------------------
  const json = (res: ServerResponse, body: unknown): void => {
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(JSON.stringify(body))
  }

  let routesRegistered = false
  const registerRoutes = (): void => {
    if (routesRegistered) return
    const webServer = ctx.get('webServer') as WebRouteHost | undefined
    if (webServer === undefined) return
    routesRegistered = true
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/wiki-api/status',
      handler: async (_req, res) => {
        const settingsSvc = ctx.get('settings') as { describe?(): { ns: string }[] } | undefined
        json(res, {
          enabled,
          running: await probe(),
          url,
          settingsAvailable: ctx.get('settings') !== undefined,
          settingsRegistered,
          described: settingsSvc?.describe?.().map(d => d.ns) ?? null,
        })
      },
    }), 'wiki-entry: status route')
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/wiki-api/open',
      handler: async (_req, res) => {
        if (!enabled) {
          res.writeHead(403)
          res.end()
          return
        }
        const result = await ensureRunning()
        json(res, {
          ok: result.ok,
          url,
          started: result.started,
          ...result.error === undefined ? {} : { error: result.error },
        })
      },
    }), 'wiki-entry: open route')
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/wiki-api/set-enabled',
      handler: async (req, res) => {
        let body = ''
        for await (const chunk of req) body += chunk
        let next: unknown
        try {
          next = JSON.parse(body)
        } catch {
          res.writeHead(400)
          res.end()
          return
        }
        if (typeof next !== 'object' || next === null || typeof (next as { enabled?: unknown }).enabled !== 'boolean') {
          res.writeHead(400)
          res.end()
          return
        }
        const want = (next as { enabled: boolean }).enabled
        const settings = ctx.get('settings') as { replace?(ns: string, section: object): Promise<unknown> } | undefined
        if (settings?.replace === undefined) {
          json(res, { ok: false, error: 'settings service is unavailable' })
          return
        }
        try {
          // Host-side write: bypasses the API-proxy exposure allowlist, so the
          // card can persist the switch without the namespace being exposed.
          await settings.replace(WIKI_NS, { enabled: want })
          enabled = want
          if (!enabled) stopServer()
          else void ensureRunning()
          json(res, { ok: true, enabled })
        } catch (error) {
          json(res, { ok: false, error: String(error instanceof Error ? error.message : error) })
        }
      },
    }), 'wiki-entry: set-enabled route')
  }
  registerSettings()
  registerRoutes()
  ctx.on('internal/service', (name) => {
    if (name === 'settings' || name === 'webServer' || name === 'subprocess') {
      registerSettings()
      registerRoutes()
    }
  })

  // Default-on auto-start: while enabled, the wiki is up as soon as the
  // harness is (best-effort; the first click also ensures it).
  if (enabled) void ensureRunning().then((result) => {
    if (!result.ok) ctx.logger.warn(`wiki-entry: auto-start failed — ${result.error ?? 'unknown'}`)
  })
}
