// Real two-turn tool-call verification: capture signature on turn 1, replay on turn 2.
import { refreshAccessToken } from '../src/oauth/refresh.ts'
import { loadMasterKey, resolveDshHome, deriveKey, createAesGcmCodec } from '../src/store/keyring.ts'
import { JsonAccountStore, decryptStorage } from '../src/store/accounts.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toAgyRequestBody } from '../src/adapter/translate.ts'
import { setThoughtSignature, getThoughtSignature } from '../src/runtime/signature-cache.ts'
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

interface PartLike { text?: string; thoughtSignature?: string; functionCall?: { id?: string; name?: string; args?: unknown } }

async function send(body: unknown): Promise<{ status: number; parts: PartLike[] }> {
  const response = await fetchAgyFirstOk('/v1internal:streamGenerateContent?alt=sse', {
    method: 'POST', headers, body: JSON.stringify(body),
  })
  const text = await response.text()
  const parts: PartLike[] = []
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') continue
    try {
      const parsed = JSON.parse(data)
      const root = parsed.response ?? parsed
      const payload = Array.isArray(root) ? root[0] : root
      for (const part of payload?.candidates?.[0]?.content?.parts ?? []) parts.push(part)
    } catch { /* ignore */ }
  }
  return { status: response.status, parts }
}

const toolDef = [{ name: 'get_weather', description: 'Get the weather for a city', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } }]

// Turn 1: model responds with a functionCall carrying a sibling thoughtSignature.
const turn1 = await send(toAgyRequestBody(
  {
    provider: 'agy',
    model: 'gemini-3-flash-agent',
    messages: [{ id: 't1', role: 'user', content: [{ type: 'text', text: 'What is the weather in Tokyo? Use the get_weather tool.' }] }],
    tools: toolDef as never,
    maxTokens: 1024,
  } as never,
  { projectId: account.projectId, sessionId: 'verify-tools' },
))
console.log('turn1 status:', turn1.status)
const fcPart = turn1.parts.find((p) => p.functionCall)
console.log('turn1 fc part keys:', fcPart ? Object.keys(fcPart).join(',') : '(none)')
const sig = typeof fcPart?.thoughtSignature === 'string' ? fcPart.thoughtSignature : null
const fcId = typeof fcPart?.functionCall?.id === 'string' ? fcPart.functionCall.id : 'fc-1'
console.log('turn1 fc id:', fcId, 'signature:', sig ? sig.slice(0, 24) + '…' : '(none)')
if (sig) setThoughtSignature(fcId, sig)
console.log('replay lookup:', (getThoughtSignature(fcId) ?? 'MISS').slice(0, 24))

// Turn 2: history carries the functionCall; the captured signature must be replayed.
const turn2 = await send(toAgyRequestBody(
  {
    provider: 'agy',
    model: 'gemini-3-flash-agent',
    messages: [
      { id: 't1', role: 'user', content: [{ type: 'text', text: 'What is the weather in Tokyo? Use the get_weather tool.' }] },
      { id: 'a1', role: 'assistant', content: [{ type: 'tool-call', id: fcId, name: 'get_weather', arguments: '{"city":"Tokyo"}' }] },
      { id: 't2', role: 'user', content: [{ type: 'tool-result', toolCallId: fcId, content: [{ type: 'text', text: '{"temp": 28, "condition": "sunny"}' }] }] },
    ],
    tools: toolDef as never,
    maxTokens: 1024,
  } as never,
  { projectId: account.projectId, sessionId: 'verify-tools' },
))
console.log('turn2 status:', turn2.status)
const textParts = turn2.parts.filter((p) => typeof p.text === 'string' && p.text.length > 0)
console.log('turn2 text:', textParts.map((p) => p.text).join('').slice(0, 160) || '(none)')
console.log(turn2.status === 200 ? 'PASS two-turn tool flow' : 'FAIL turn2')
