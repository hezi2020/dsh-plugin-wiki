/**
 * Real-account end-to-end script (never runs in CI).
 *
 * Usage: AGY_REFRESH_TOKEN=<rt> npm run e2e [-- --model gemini-2.5-flash]
 *
 * Exercises the full stack against the live backend: refresh → account store →
 * session manager → model discovery → adapter streaming → verification.
 * Normal-user behavior only.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { refreshAccessToken } from '../src/oauth/refresh.ts'
import { createAesGcmCodec, deriveKey, resolveDshHome } from '../src/store/keyring.ts'
import { JsonAccountStore } from '../src/store/accounts.ts'
import { upsertImportedAccount } from '../src/cli/import.ts'
import { AgySessionManager } from '../src/session.ts'
import { AgyAdapter } from '../src/adapter/adapter.ts'
import { listAgyModels } from '../src/adapter/models.ts'

async function main(): Promise<void> {
  const refreshToken = process.env.AGY_REFRESH_TOKEN
  if (!refreshToken) {
    console.error('AGY_REFRESH_TOKEN is required.')
    process.exit(1)
  }
  const model = process.argv.find((a) => a.startsWith('--model='))?.split('=')[1] ?? 'gemini-2.5-flash'
  const dshHome = process.env.DSH_HOME ?? resolveDshHome()

  // 1. Refresh to obtain an access token.
  const refreshResult = await refreshAccessToken({ access: '', expires: 0, refresh: refreshToken })
  if (refreshResult.type !== 'success') {
    console.error('refresh failed:', refreshResult)
    process.exit(1)
  }
  console.log('✓ refresh')

  // 2. Seed a throwaway store with the account.
  const dir = mkdtempSync(join(tmpdir(), 'dsh-agy-e2e-'))
  const store = new JsonAccountStore({
    file: join(dir, 'agy-accounts.json'),
    codec: createAesGcmCodec(deriveKey('e2e-master-key-000000000000000000000000')),
  })
  await upsertImportedAccount(store, {
    accessToken: refreshResult.auth.access,
    refreshToken,
    tokenType: 'Bearer',
    expiresAt: new Date(refreshResult.auth.expires).toISOString(),
    authMethod: 'e2e',
    email: process.env.AGY_E2E_EMAIL ?? null,
    projectId: null,
  })
  console.log('✓ store seeded')

  // 3. Session manager resolves a usable session (refreshes on demand).
  const sessions = new AgySessionManager({ store })
  const session = await sessions.getSession()
  if (!session) {
    console.error('getSession returned no session')
    process.exit(1)
  }
  console.log(`✓ session (email: ${session.account.email ?? '(none)'}, project: ${session.account.projectId ?? '(none)'})`)

  // 4. Model discovery.
  const models = await listAgyModels(session.auth.access, session.account.projectId)
  console.log(`✓ model discovery: ${models.length} models (first: ${models[0]?.id})`)

  // 5. One streaming call through the adapter.
  const adapter = new AgyAdapter({
    getSession: () => sessions.getSession(),
    reportFailure: (kind, s, info) => sessions.reportFailure(kind, s, info),
    markSuccess: (s) => sessions.markSuccess(s),
  })
  const text: string[] = []
  for await (const chunk of adapter.stream({
    provider: 'agy',
    model,
    messages: [{ id: 'e2e-1', role: 'user', content: [{ type: 'text', text: 'Reply with exactly: OK' }] }],
    maxTokens: 32,
  })) {
    if (chunk.type === 'text-delta') text.push(chunk.text)
  }
  console.log(`✓ stream (model ${model}): ${JSON.stringify(text.join(''))}`)

  // 6. Verification.
  const verified = await sessions.verifyAccount(0)
  console.log(`✓ verify: ${verified.ok ? `OK${verified.email ? ` (${verified.email})` : ''}` : `FAILED ${verified.error}`}`)

  rmSync(dir, { recursive: true, force: true })
  console.log(`\nAll e2e steps passed (dsh home: ${dshHome}).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
