/**
 * Debug probe: bisect why dsh-agy requests get 429 while OmniRoute/agy CLI work.
 *
 * Reads the local account store (decrypts it), refreshes an access token, then
 * fires a matrix of minimal probe requests against streamGenerateContent —
 * varying (a) header composition (OmniRoute cli / OmniRoute ide / ours) and
 * (b) project presence — printing status + body for each. Normal-user traffic
 * only: ~6 short calls, no concurrency, no fingerprint churn.
 *
 * Usage: npm run debug:request [-- --model gemini-3-flash-agent]
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { refreshAccessToken } from '../src/oauth/refresh.ts'
import { loadMasterKey, resolveDshHome, deriveKey, createAesGcmCodec } from '../src/store/keyring.ts'
import { JsonAccountStore, decryptStorage } from '../src/store/accounts.ts'
import { loadCodeAssist } from '../src/oauth/exchange.ts'
import { AGY_ENDPOINT_PROD } from '../src/oauth/constants.ts'
import { getRandomizedHeaders } from '../src/runtime/fingerprint.ts'

async function main(): Promise<void> {
  const model = process.argv.find((a) => a.startsWith('--model='))?.split('=')[1] ?? 'gemini-3-flash-agent'
  const dshHome = resolveDshHome()

  // 1. Decrypt the account store and show its state.
  const masterKey = loadMasterKey(dshHome)
  if (!masterKey) {
    console.error('No AGY_MASTER_KEY in credentials document — run `dsh-agy login` first.')
    process.exit(1)
  }
  const codec = createAesGcmCodec(deriveKey(masterKey))
  const store = new JsonAccountStore({ file: join(dshHome, 'agy-accounts.json'), codec })
  const raw = readFileSync(join(dshHome, 'agy-accounts.json'), 'utf8')
  const storage = decryptStorage(JSON.parse(raw), codec)
  for (const [i, account] of storage.accounts.entries()) {
    console.log(`account[${i}] email=${account.email ?? '(none)'} projectId=${JSON.stringify(account.projectId)} managedProjectId=${JSON.stringify(account.managedProjectId)}`)
  }
  const account = storage.accounts[0]
  if (!account) {
    console.error('No accounts. Run `dsh-agy login`.')
    process.exit(1)
  }

  // 2. Refresh → access token.
  const refreshed = await refreshAccessToken({ access: '', expires: 0, refresh: account.refresh })
  if (refreshed.type !== 'success') {
    console.error('refresh failed:', refreshed)
    process.exit(1)
  }
  const access = refreshed.auth.access

  // 3. loadCodeAssist: can we discover the project at all right now?
  const discovered = await loadCodeAssist(access)
  console.log(`\nloadCodeAssist now: projectId=${JSON.stringify(discovered.projectId)} tierId=${discovered.tierId}\n`)

  const url = `${AGY_ENDPOINT_PROD}/v1internal:streamGenerateContent?alt=sse`
  const body = JSON.stringify({
    project: undefined,
    requestId: `agent/${Date.now()}/debug`,
    model,
    userAgent: 'antigravity',
    requestType: 'agent',
    request: {
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
      generationConfig: { maxOutputTokens: 16 },
      sessionId: '-1',
    },
  })

  const random = getRandomizedHeaders()

  const variants: Array<{ name: string; headers: Record<string, string>; project?: string }> = [
    {
      name: 'A1 omniroute-cli-headers, no project',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'antigravity/cli/1.19.0 (aidev_client; os_type=macos; arch=arm64; auth_method=consumer)',
        Authorization: `Bearer ${access}`,
        Accept: 'text/event-stream',
      },
    },
    {
      name: 'A2 omniroute-cli-headers, + project',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'antigravity/cli/1.19.0 (aidev_client; os_type=macos; arch=arm64; auth_method=consumer)',
        Authorization: `Bearer ${access}`,
        Accept: 'text/event-stream',
      },
      project: discovered.projectId || undefined,
    },
    {
      name: 'B1 omniroute-ide-node-headers, no project',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `antigravity/1.19.0 macos/arm64 google-cloud-sdk vscode_cloudshelleditor/0.1`,
        'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
        Authorization: `Bearer ${access}`,
        Accept: 'text/event-stream',
      },
    },
    {
      name: 'B2 omniroute-ide-node-headers, + project',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `antigravity/1.19.0 macos/arm64 google-cloud-sdk vscode_cloudshelleditor/0.1`,
        'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
        Authorization: `Bearer ${access}`,
        Accept: 'text/event-stream',
      },
      project: discovered.projectId || undefined,
    },
    {
      name: 'C1 our-fingerprint-headers, no project',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'User-Agent': random['User-Agent'],
        'X-Goog-Api-Client': random['X-Goog-Api-Client'],
        'Client-Metadata': random['Client-Metadata'],
        Authorization: `Bearer ${access}`,
      },
    },
    {
      name: 'C2 our-fingerprint-headers, + project',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'User-Agent': random['User-Agent'],
        'X-Goog-Api-Client': random['X-Goog-Api-Client'],
        'Client-Metadata': random['Client-Metadata'],
        Authorization: `Bearer ${access}`,
      },
      project: discovered.projectId || undefined,
    },
  ]

  for (const variant of variants) {
    const probeBody = variant.project
      ? body.replace('"project":undefined', JSON.stringify(variant.project))
      : body.replace('"project":undefined,', '')
    const response = await fetch(url, {
      method: 'POST',
      headers: variant.headers,
      body: probeBody,
    })
    const text = await response.text()
    const snippet = text.slice(0, 160).replace(/\n/g, ' ')
    const ok = response.ok ? 'OK ' : `ERR ${response.status}`
    console.log(`${ok.padEnd(8)} ${variant.name}`)
    console.log(`         ${snippet}`)
    if (!response.ok) {
      const errorJson = (() => {
        try { return JSON.parse(text) } catch { return null }
      })() as { error?: { status?: string; message?: string } } | null
      console.log(`         status=${errorJson?.error?.status} message=${errorJson?.error?.message}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
