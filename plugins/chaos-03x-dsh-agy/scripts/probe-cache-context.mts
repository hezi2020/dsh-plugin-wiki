// Cache-hit probe mimicking REAL agent traffic: a long system prompt plus a
// GROWING multi-turn history (the single-turn probe-cache.mts gets cached=n/a
// even for models that demonstrably report cachedContentTokenCount in real
// sessions, so this checks whether multi-turn context is what activates the
// server-side cache — and whether any model genuinely never reports it).
import { refreshAccessToken } from '../src/oauth/refresh.ts'
import { loadMasterKey, resolveDshHome, deriveKey, createAesGcmCodec } from '../src/store/keyring.ts'
import { JsonAccountStore, decryptStorage } from '../src/store/accounts.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toAgyRequestBody } from '../src/adapter/translate.ts'
import { fetchAgyFirstOk } from '../src/oauth/constants.ts'

const dshHome = resolveDshHome()
const masterKey = loadMasterKey(dshHome)
const codec = createAesGcmCodec(deriveKey(masterKey))
const storage = decryptStorage(JSON.parse(readFileSync(join(dshHome, 'agy-accounts.json'), 'utf8')), codec)
const account = storage.accounts[0]
const refreshed = await refreshAccessToken({ access: '', expires: 0, refresh: account.refresh })
const access = refreshed.type === 'success' ? refreshed.auth.access : ''
if (!access) process.exit(1)

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${access}`,
  Accept: 'text/event-stream',
  'User-Agent': 'antigravity/cli/1.19.0 (aidev_client; os_type=macos; arch=arm64; auth_method=consumer)',
}

interface Usage { promptTokenCount?: number; cachedContentTokenCount?: number; totalTokenCount?: number }

async function send(body: unknown, label: string): Promise<void> {
  const response = await fetchAgyFirstOk('/v1internal:streamGenerateContent?alt=sse', {
    method: 'POST', headers, body: JSON.stringify(body),
  })
  const text = await response.text()
  let usage: Usage | null = null
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') continue
    try {
      const parsed = JSON.parse(data)
      const root = parsed.response ?? parsed
      const payload = Array.isArray(root) ? root[0] : root
      if (payload?.usageMetadata) usage = payload.usageMetadata
    } catch { /* ignore */ }
  }
  const cached = usage?.cachedContentTokenCount
  const uncached = usage && cached !== undefined
    ? Math.max(0, (usage.promptTokenCount ?? 0) - cached)
    : undefined
  console.log(`${label}: status=${response.status} cached=${cached ?? 'n/a'} prompt=${usage?.promptTokenCount ?? 'n/a'} uncached=${uncached ?? 'n/a'}`)
}

// Long system prompt so the cached prefix is well above any threshold
// (real DSH sessions show caching engaging only once the prefix reaches
// ~16-19k tokens; a 3.7k prefix stays below it and reports nothing).
const SENTENCE = 'The project is a plugin for DeepSeek Harness that authenticates with Google Antigravity. ' +
  'It handles OAuth, token refresh, multi-account rotation, device fingerprinting, quota dashboards, and tool calls. '
const SYSTEM = 'You are a coding assistant. Answer in Chinese. ' + SENTENCE.repeat(500)

const u = (text: string) => ({ id: `u-${text.length}`, role: 'user' as const, content: [{ type: 'text' as const, text }] })
const m = (text: string) => ({ id: `m-${text.length}`, role: 'assistant' as const, content: [{ type: 'text' as const, text }] })

const model = process.env.AGY_CACHE_MODEL || 'gemini-3.7-flash-tiered'
console.log(`=== model=${model} ===`)

const a1 = 'The main feature is keyless access to Google-backed models through the Antigravity gateway.'
const a2 = 'OAuth uses PKCE with a device fingerprint, then refresh tokens rotate across a pool of accounts.'
const a3 = 'Session rotation picks the healthiest account per request and cools down exhausted ones.'

await send(toAgyRequestBody({ provider: 'agy', model, system: SYSTEM, maxTokens: 64, messages: [u('What is the main feature? Reply briefly.')] } as never, { projectId: account.projectId, sessionId: 'cache-context-probe' }), '#1 single turn, nothing cached yet')
await send(toAgyRequestBody({ provider: 'agy', model, system: SYSTEM, maxTokens: 64, messages: [u('What is the main feature? Reply briefly.'), m(a1), u('Describe the OAuth flow in two sentences.')] } as never, { projectId: account.projectId, sessionId: 'cache-context-probe' }), '#2 history grows, prefix = #1')
await send(toAgyRequestBody({ provider: 'agy', model, system: SYSTEM, maxTokens: 64, messages: [u('What is the main feature? Reply briefly.'), m(a1), u('Describe the OAuth flow in two sentences.'), m(a2), u('How does session rotation work? One sentence.')] } as never, { projectId: account.projectId, sessionId: 'cache-context-probe' }), '#3 history grows, prefix = #2')
