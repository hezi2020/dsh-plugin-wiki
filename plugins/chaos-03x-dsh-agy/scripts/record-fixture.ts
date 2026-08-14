/**
 * Record real-API fixtures for the test suite.
 *
 * Usage:  AGY_REFRESH_TOKEN=<rt> npm run record:fixtures [-- --model gemini-2.5-flash]
 *
 * Performs only normal user actions (one refresh, one model listing, one short
 * stream) — no concurrency, no fingerprint churn, no deliberate 429s.
 * Output: tests/fixtures/recorded/{refresh,models,stream}.json with secrets masked.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { refreshAccessToken } from '../src/oauth/refresh.ts'
import { fetchAvailableModels } from '../src/adapter/models.ts'
import { AGY_ENDPOINT_PROD } from '../src/oauth/constants.ts'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT_DIR = join(ROOT, 'tests', 'fixtures', 'recorded')

interface RecordedEntry {
  label: string
  request: { method?: string; url: string; headers: Record<string, string>; body?: unknown }
  response: { status: number; headers: Record<string, string>; body: unknown }
}

const entries: RecordedEntry[] = []

function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (/authorization|proxy-authorization/i.test(key)) out[key] = 'Bearer ***'
    else out[key] = value
  }
  return out
}

function maskDeep(value: unknown, depth = 0): unknown {
  if (depth > 6) return value
  if (typeof value === 'string') {
    if (value.length > 60 && /^[A-Za-z0-9_\-.]{20,}$/.test(value)) return `${value.slice(0, 8)}…${value.slice(-4)}`
    if (value.includes('@')) return value.replace(/(.{2})[^@]*(@.*)/, '$1***$2')
    return value
  }
  if (Array.isArray(value)) return value.map((v) => maskDeep(v, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => {
      if (/token|secret|password|key/i.test(k)) return [k, '***']
      return [k, maskDeep(v, depth + 1)]
    }))
  }
  return value
}

const originalFetch = globalThis.fetch

function record(label: string, url: string, init: RequestInit | undefined, response: Response, bodyText: string) {
  entries.push({
    label,
    request: {
      method: init?.method ?? 'GET',
      url,
      headers: maskHeaders(Object.fromEntries(new Headers(init?.headers).entries())),
      body: init?.body ? maskDeep(JSON.parse(String(init.body))) : undefined,
    },
    response: {
      status: response.status,
      headers: maskHeaders(Object.fromEntries(response.headers.entries())),
      body: maskDeep(JSON.parse(bodyText)),
    },
  })
}

async function main(): Promise<void> {
  const refreshToken = process.env.AGY_REFRESH_TOKEN
  if (!refreshToken) {
    console.error('AGY_REFRESH_TOKEN is required.')
    process.exit(1)
  }
  const model = process.argv.find((a) => a.startsWith('--model='))?.split('=')[1] ?? 'gemini-2.5-flash'

  // 1. Refresh → access token.
  const refreshResult = await refreshAccessToken({ access: '', expires: 0, refresh: refreshToken })
  if (refreshResult.type !== 'success') {
    console.error('Refresh failed:', refreshResult)
    process.exit(1)
  }
  const access = refreshResult.auth.access

  // 2. Model listing (needs the real fetch, captured through a recorder).
  let modelsResponse: Response
  let modelsText = ''
  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    const response = await originalFetch(url, init)
    if (url.includes('fetchAvailableModels')) {
      modelsResponse = response
      modelsText = await response.clone().text()
      record('fetchAvailableModels', url, init, response, modelsText)
    }
    return response
  }) as typeof fetch
  await fetchAvailableModels(access, undefined, fetchImpl)

  // 3. One short stream.
  const streamUrl = `${AGY_ENDPOINT_PROD}/v1internal:streamGenerateContent?alt=sse`
  const streamInit: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'User-Agent': 'dsh-agy record-fixture',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
      generationConfig: { maxOutputTokens: 32 },
    }),
  }
  const streamResponse = await originalFetch(streamUrl, streamInit)
  const streamText = await streamResponse.text()
  record('streamGenerateContent', streamUrl, streamInit, streamResponse, streamText)

  // 4. Persist.
  mkdirSync(OUT_DIR, { recursive: true })
  const payload = {
    recordedAt: new Date().toISOString(),
    model,
    entries,
  }
  const outFile = join(OUT_DIR, 'fixtures.json')
  writeFileSync(outFile, JSON.stringify(payload, null, 2))
  console.log(`Wrote ${entries.length} fixture entries to ${outFile}`)
  console.log('NOTE: review the masked output for leaks before committing.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
