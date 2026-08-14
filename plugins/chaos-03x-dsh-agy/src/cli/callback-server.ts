/** Loopback OAuth callback server for the standalone CLI login flow. */

import { createServer } from 'node:http'
import type { Server } from 'node:http'

export interface CallbackResult {
  code: string
  state: string
  url: string
}

export interface CallbackHandle {
  result: Promise<CallbackResult>
  /** Resolves once the loopback listener is bound; rejects on bind errors. */
  ready: Promise<void>
  close(): Promise<void>
}

const SUCCESS_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Login successful</title></head>
<body style="font-family:system-ui;text-align:center;padding:3rem">
<h2>✓ Authentication successful</h2>
<p>You can close this tab and return to the terminal.</p>
</body></html>`

/** Listen on 127.0.0.1:<port>/oauth-callback and resolve with the code+state. */
export function startCallbackServer(options: { port?: number; timeoutMs?: number } = {}): CallbackHandle {
  const port = options.port ?? 51121
  const timeoutMs = options.timeoutMs ?? 300_000

  let resolveResult: (value: CallbackResult) => void
  let rejectResult: (reason: Error) => void
  const result = new Promise<CallbackResult>((resolve, reject) => {
    resolveResult = resolve
    rejectResult = reject
  })

  let resolveReady: () => void
  let rejectReady: (reason: Error) => void
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname === '/oauth-callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      if (!code || !state) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<h2>Missing code or state</h2>')
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html', connection: 'close' })
      res.end(SUCCESS_HTML)
      resolveResult({ code, state, url: url.toString() })
      // Give the browser a moment to render before the server closes.
      setTimeout(() => server.close(), 1500)
      return
    }
    res.writeHead(404)
    res.end('Not found')
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      rejectResult(new Error(`Port ${port} is already in use — pass --port to pick another.`))
    } else {
      rejectResult(error)
    }
    rejectReady(error)
  })

  server.listen(port, '127.0.0.1', () => {
    resolveReady()
  })

  const timeout = setTimeout(() => {
    rejectResult(new Error('Authentication timed out — no callback received.'))
    server.close()
  }, timeoutMs)

  const handle: CallbackHandle = {
    result,
    ready,
    async close() {
      clearTimeout(timeout)
      if (server.listening) {
        // The success page's keep-alive connection would otherwise hold
        // server.close() (and the CLI process) open indefinitely.
        server.closeAllConnections()
        await new Promise<void>((resolve) => server.close(() => resolve()))
      }
    },
  }
  return handle
}

/** Open a URL in the system browser (best effort). */
export async function openBrowser(url: string): Promise<boolean> {
  const { spawn } = await import('node:child_process')
  const platform = process.platform
  const command = platform === 'darwin' ? ['open', url]
    : platform === 'win32' ? ['cmd', '/c', 'start', '', url]
    : ['xdg-open', url]
  return new Promise<boolean>((resolve) => {
    const child = spawn(command[0]!, command.slice(1), { stdio: 'ignore' })
    child.on('error', () => resolve(false))
    child.on('spawn', () => resolve(true))
  })
}
