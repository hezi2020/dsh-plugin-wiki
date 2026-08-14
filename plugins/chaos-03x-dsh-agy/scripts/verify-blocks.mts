// Real streaming verification: one continuous text block across SSE events.
import { refreshAccessToken } from '../src/oauth/refresh.ts'
import { loadMasterKey, resolveDshHome, deriveKey, createAesGcmCodec } from '../src/store/keyring.ts'
import { JsonAccountStore, decryptStorage } from '../src/store/accounts.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAgySse } from '../src/adapter/parse.ts'
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
const body = toAgyRequestBody(
  {
    provider: 'agy', model: 'gemini-3-flash-agent',
    messages: [{ id: 't1', role: 'user', content: [{ type: 'text', text: 'Write a 3-sentence introduction of yourself in Chinese.' }] }],
    maxTokens: 2048,
  } as never,
  { projectId: account.projectId, sessionId: 'verify-blocks' },
)
const response = await fetchAgyFirstOk('/v1internal:streamGenerateContent?alt=sse', { method: 'POST', headers, body: JSON.stringify(body) })
if (!response.ok) {
  console.log('ERROR status:', response.status)
  console.log((await response.text()).slice(0, 400))
  process.exit(0)
}
const chunks: Array<{ type: string; text?: string; usage?: unknown }> = []
for await (const chunk of parseAgySse(response.body!)) chunks.push(chunk as { type: string; text?: string; usage?: unknown })
const starts = chunks.filter((c) => c.type === 'block-start')
const ends = chunks.filter((c) => c.type === 'block-end')
const usages = chunks.filter((c) => c.type === 'usage')
const deltas = chunks.filter((c) => c.type === 'text-delta').map((c) => c.text ?? '')
console.log('status: 200')
console.log('block-start:', starts.length, 'block-end:', ends.length, 'usage:', usages.length)
console.log('text:', deltas.join('').slice(0, 260))
console.log(starts.length === 1 && ends.length === 1 ? 'PASS single continuous block' : 'FAIL block splitting')
