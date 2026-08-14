/**
 * dsh-agy main plugin entry: registers the `agy` LLM provider route and
 * initializes the account store. The /agy web UI is registered by the sibling
 * `dsh-agy/web` entry (it must wait for ctx.webServer to activate). No plugin
 * Config — all product decisions are fixed by design (no user configuration surface).
 */

import type { Context } from '@deepseek-ai/cordis'
import { AGY_PROVIDER, createAgyRuntime } from './plugin-common.ts'

export const name = 'dsh-agy'

export const inject = ['llm']

export function apply(ctx: Context): void {
  ctx.effect(async () => {
    const { adapter } = await createAgyRuntime(ctx)
    const registration = ctx.llm.registerAdapter([AGY_PROVIDER], adapter)
    return () => registration()
  })
}
