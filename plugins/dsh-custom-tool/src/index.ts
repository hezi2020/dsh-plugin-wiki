/**
 * dsh-custom-tool host half: registers the `custom-tools` settings namespace,
 * mirrors its enabled tools into `ctx.tools` (whose schemas the system prompt
 * assembles automatically), exposes the model-facing management toolset, and
 * injects the custom-tool guidance section into the system prompt.
 */
import type { Context } from '@deepseek-ai/cordis'
import { CustomToolRegistry } from './registry.ts'
import { registerModelTools } from './model-tools.ts'
import { PROMPT_SECTION_TEXT } from './prompt.ts'
import { registerCustomToolsSettings, type CustomToolConfig } from './settings.ts'

export { Config } from './settings.ts'
export type { CustomToolConfig } from './settings.ts'
export type { CustomTool, CustomToolsSettings } from './types.ts'
export { CUSTOM_TOOLS_NAMESPACE } from './settings.ts'

export const name = 'dsh-custom-tool'
export const inject = ['settings', 'tools', 'systemPrompt']

/**
 * Mount the plugin: settings namespace, live tool registry, model toolset, prompt section.
 * @param ctx - the plugin context.
 * @param config - schemastery-resolved {@link CustomToolConfig}.
 */
export function apply(ctx: Context, config: CustomToolConfig): void {
  const scope = registerCustomToolsSettings(ctx, config)
  const registry = new CustomToolRegistry(ctx, config)
  registerModelTools(ctx, scope, config, registry)
  ctx.systemPrompt.section({ name: 'custom-tools:guidance', order: 400, text: PROMPT_SECTION_TEXT })
  ctx.effect(() => {
    const stop = scope.watch(next => { registry.reconcile(next.tools) })
    registry.reconcile(scope.get().tools)
    // Workspace-location tools ride each matching agent's own scope: register
    // them when an agent appears and sweep when one leaves (the agent's fiber
    // cleans its scoped registrations; the sweep drops the stale bookkeeping).
    const onCreated = ctx.on('agent/created', (payload) => {
      registry.registerAgent(payload.agent as never)
    })
    const onDisposed = ctx.on('agent/disposed', (payload) => {
      registry.registerAgent(payload.agent as never)
    })
    return () => {
      onCreated()
      onDisposed()
      stop()
      registry.clear()
    }
  }, 'dsh-custom-tool: live tool registry')
}
