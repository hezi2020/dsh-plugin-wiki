// Cache-loss probe: locate WHY cachedContentTokenCount runs ~3k tokens below
// the previous round's full prompt. Two candidate sites:
//   (a) server-side cache write is delayed/batched (loss ≈ previous round's
//       newly added tokens — the observed pattern in real sessions);
//   (b) our request prefix diverges from the previous round (loss ≈ divergence
//       point, e.g. a dynamic system-prompt snapshot).
// Methodology: fixed large system prompt (>16k so the first round is cacheable),
// each round appends a ~4k-token "tool-result"-sized user block; every request
// body is dumped to /tmp/probe-loss-rounds.jsonl for byte-level prefix diffing.
import { refreshAccessToken } from '../src/oauth/refresh.ts'
import { loadMasterKey, resolveDshHome, deriveKey, createAesGcmCodec } from '../src/store/keyring.ts'
import { JsonAccountStore, decryptStorage } from '../src/store/accounts.ts'
import { readFileSync, appendFileSync } from 'node:fs'
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

const SENTENCE = 'The project is a plugin for DeepSeek Harness that authenticates with Google Antigravity. ' +
  'It handles OAuth, token refresh, multi-account rotation, device fingerprinting, quota dashboards, and tool calls. '
const SYSTEM = 'You are a coding assistant. Answer in Chinese. ' + SENTENCE.repeat(500) // ~20.5k tokens
const model = process.env.AGY_CACHE_MODEL || 'gemini-3.7-flash-tiered'

// ~4k-token filler simulating a tool-result-size addition per round
const FILLER = 'Tool output follows. ' + SENTENCE.repeat(70) // 70 * ~56t ≈ 3.9k tokens

interface Usage { promptTokenCount?: number; candidatesTokenCount?: number; cachedContentTokenCount?: number }

async function send(messages: unknown, label: string): Promise<{ usage: Usage | null; reply: string }> {
  const body = toAgyRequestBody(
    { provider: 'agy', model, system: SYSTEM, maxTokens: 256, messages } as never,
    { projectId: account.projectId, sessionId: 'cache-loss-probe' },
  )
  appendFileSync('/tmp/probe-loss-rounds.jsonl', JSON.stringify({ label, body }) + '\n')
  const response = await fetchAgyFirstOk('/v1internal:streamGenerateContent?alt=sse', {
    method: 'POST', headers, body: JSON.stringify(body),
  })
  const text = await response.text()
  let usage: Usage | null = null
  let reply = ''
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') continue
    try {
      const parsed = JSON.parse(data)
      const root = parsed.response ?? parsed
      const payload = Array.isArray(root) ? root[0] : root
      if (payload?.usageMetadata) usage = payload.usageMetadata
      const parts = payload?.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) if (typeof part.text === 'string') reply += part.text
    } catch { /* ignore */ }
  }
  const c = usage?.cachedContentTokenCount
  const u = usage && c !== undefined ? Math.max(0, (usage.promptTokenCount ?? 0) - c) : undefined
  console.log(`${label}: status=${response.status} prompt=${usage?.promptTokenCount ?? 'n/a'} cached=${c ?? 'n/a'} uncached=${u ?? 'n/a'} reply=${reply.length}ch`)
  return { usage, reply }
}

const u = (text: string) => ({ id: `u-${text.length}`, role: 'user' as const, content: [{ type: 'text' as const, text }] })
const m = (text: string) => ({ id: `m-${text.length}`, role: 'assistant' as const, content: [{ type: 'text' as const, text }] })

console.log(`=== cache-loss probe: model=${model}, ${6} rounds ===`)
const history: Array<ReturnType<typeof u> | ReturnType<typeof m>> = []
for (let round = 1; round <= 6; round++) {
  const question = `ROUND ${round}: State the key fact from the tool output in one short line.`
  history.push(u(`${FILLER}\n\n${question}`))
  const { reply } = await send(history, `round ${round}`)
  if (!reply) { console.log(`round ${round}: empty reply, aborting`); break }
  history.push(m(reply.slice(0, 400)))
}
