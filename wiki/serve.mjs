// Static wiki server for the DeepSeek Harness Chinese wiki (built MkDocs site).
// Serves the pre-built site under a /wiki prefix so the Web UI can host it on a
// dedicated local port. Env overrides: WIKI_PORT (8099), WIKI_ROOT (site dir),
// WIKI_PREFIX (/wiki).
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HOST = '127.0.0.1'
const PORT = Number(process.env.WIKI_PORT ?? 8099)
// 默认站点目录为脚本同级的 site/（即 wiki 检出目录下的 site），可通过 WIKI_ROOT 覆盖
const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), 'site')
const ROOT = resolve(process.env.WIKI_ROOT ?? DEFAULT_ROOT)
const PREFIX = process.env.WIKI_PREFIX ?? '/wiki'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json',
}

const server = createServer(async (req, res) => {
  try {
    const raw = new URL(req.url ?? '/', 'http://x').pathname
    if (!(raw === PREFIX || raw.startsWith(PREFIX + '/'))) {
      res.writeHead(404); res.end(); return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405); res.end(); return
    }
    const rel = decodeURIComponent(raw.slice(PREFIX.length))
    const target = resolve(normalize(join(ROOT, rel)))
    if (target !== ROOT && !target.startsWith(ROOT + sep)) {
      res.writeHead(403); res.end(); return
    }
    const candidates = [target, join(target, 'index.html')]
    let body
    for (const candidate of candidates) {
      try {
        body = await readFile(candidate)
        res.writeHead(200, { 'content-type': MIME[extname(candidate)] ?? 'application/octet-stream' })
        res.end(body)
        return
      } catch {
        // try next candidate
      }
    }
    // Fallback: the site home page keeps deep links usable.
    body = await readFile(join(ROOT, 'index.html'))
    res.writeHead(200, { 'content-type': MIME['.html'] })
    res.end(body)
  } catch (error) {
    res.writeHead(400); res.end(String(error))
  }
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    // Another instance already owns the port — treat as success so a
    // redundant spawn (e.g. a second click) is harmless.
    console.log('wiki server: port already in use')
    process.exit(0)
  }
  console.error(`wiki server error: ${error.message}`)
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`wiki server: http://${HOST}:${PORT}${PREFIX}/`)
})

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 1000).unref()
  })
}
