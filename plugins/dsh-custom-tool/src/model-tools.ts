/**
 * The model-facing management toolset: create, remove, and list custom tools.
 * Global-location tools persist through the settings scope and require
 * explicit user approval when the MODEL creates them; workspace-location
 * tools live in the per-workspace store and are autonomous. Both paths
 * share one validation gate.
 */
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { CustomToolRegistry } from './registry.ts'
import type { CustomToolConfig } from './settings.ts'
import { validateTool } from './settings.ts'
import type { CustomTool, CustomToolsSettings } from './types.ts'

type ApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'

interface ApprovalLike {
  request(req: { agent: unknown; toolName: string; callId?: unknown; reason?: string; signal?: AbortSignal }): Promise<ApprovalOutcome>
}

interface AgentLike {
  session: { header: { cwd: string } }
}

interface AgentsLike {
  currentInitiator(): AgentLike | undefined
}

/**
 * Fail-closed approval for a model request to create a GLOBAL tool.
 * @param ctx - the plugin context.
 * @param tool - the tool the model wants to persist globally.
 * @param callId - the exact create call for UI attachment.
 * @param signal - the call's cancellation signal.
 * @returns allowed-once on grant; throws a model-readable refusal otherwise.
 */
async function authorizeGlobalCreation(
  ctx: Context,
  tool: CustomTool,
  callId: unknown,
  signal: AbortSignal | undefined,
): Promise<void> {
  const agents = ctx.get('agents') as AgentsLike | undefined
  const approval = ctx.get('approval') as ApprovalLike | undefined
  const agent = agents?.currentInitiator()
  if (agent === undefined || approval === undefined) {
    throw new Error('creating a global custom tool requires an active session with approval support; the request fails closed')
  }
  const outcome = await approval.request({
    agent,
    toolName: 'custom_tool_create',
    callId,
    reason: 'The model requests creating the GLOBAL custom tool "' + tool.name + '" (scope ' + tool.scope + ', location global). It becomes available in every workspace and persists until removed.',
    signal,
  })
  if (outcome !== 'allowed-once') {
    throw new Error('the user did not authorize creating the global custom tool "' + tool.name + '" (approval outcome: ' + outcome + '); tell the user it was declined')
  }
}

/**
 * Register `custom_tool_create`, `custom_tool_remove`, and `custom_tools_list`.
 * @param ctx - the plugin context.
 * @param scope - the `custom-tools` settings owner scope.
 * @param config - resolved plugin configuration.
 * @param registry - the live registry supplying workspace stores and failures.
 */
export function registerModelTools(
  ctx: Context,
  scope: SettingsScope<CustomToolsSettings>,
  config: CustomToolConfig,
  registry: CustomToolRegistry,
): void {
  const now = (): string => new Date().toISOString()

  ctx.tools.register(defineTool({
    name: 'custom_tool_create',
    description:
      'Grow yourself a new custom tool: persist a JavaScript function under a snake_case name and hot-register it, '
      + 'so it is callable on your NEXT step. Calling custom_tool_create again with the same name in the SAME location '
      + 'REPLACES that tool (its id, createdAt, and enabled flag are preserved). Two locations exist: location "global" '
      + 'stores the tool in the shared settings so EVERY workspace sees it — creating one requires the user\'s explicit '
      + 'approval (this call asks and fails when declined); location "workspace" (the default) stores the tool in the '
      + 'CURRENT workspace only and is fully autonomous. Scope selects execution: "global" is the network-only sandbox, '
      + '"workspace" additionally grants fs (readFile/writeFile/list) confined to the active workspace root — a global-location '
      + 'tool with workspace scope (e.g. a pdf reader) runs on whichever workspace it is called from. Validation is strict '
      + 'and shared with the settings UI; invalid input rejects the write and nothing persists. The code is the async '
      + 'function BODY over (args, env); see the Custom tools system-prompt section for the sandbox contract.',
    parameters: {
      name: {
        type: 'string',
        required: true,
        description: 'snake_case tool name matching /^[a-z][a-z0-9_]{0,63}$/; must not be one of custom_tool_create, custom_tool_remove, custom_tools_list.',
      },
      description: {
        type: 'string',
        required: true,
        description: 'What the tool does and when to call it — this text is what the model reads on future steps.',
      },
      parameters: {
        type: 'json',
        required: true,
        description: 'JSON Schema for the call arguments, object root, in the harness subset: type/properties/required/items/enum/description only.',
      },
      code: {
        type: 'string',
        required: true,
        description: 'The async function body over (args, env). Return a JSON value; undefined is an error.',
      },
      scope: {
        type: 'string',
        enum: ['global', 'workspace'],
        description: "Execution scope (default 'global'): 'global' runs in the network-only sandbox; 'workspace' additionally grants an fs capability (readFile/writeFile/list) confined to the session workspace root.",
      },
      location: {
        type: 'string',
        enum: ['global', 'workspace'],
        description: "Storage location (default 'workspace' for model-created tools): 'global' persists in the shared settings for every workspace and REQUIRES the user's explicit approval; 'workspace' belongs to the current workspace only and is autonomous.",
      },
      enabled: {
        type: 'boolean',
        description: 'Register the tool immediately (default true). Disabled tools are stored but not callable.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          replaced: { type: 'boolean', required: true },
          location: { type: 'string', required: true },
          total: { type: 'integer', required: true },
          enabled: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => [
        {
          type: 'text',
          text: 'Custom tool "' + value.name + '" ' + (value.replaced ? 'replaced' : 'created') + ' in ' + value.location + ' (now ' + value.total + ' tools there, ' + (value.enabled ? 'enabled' : 'disabled') + '). Callable from your next step.',
        },
      ],
    },
    async execute(args, exec) {
      const location: CustomTool['location'] = args.location ?? 'workspace'
      const agents = ctx.get('agents') as AgentsLike | undefined
      const agent = agents?.currentInitiator()

      const globalTools = scope.get().tools
      void agent

      const existing = location === 'global'
        ? globalTools.find(tool => tool.name === args.name)
        : registry.currentWorkspaceTools().find(tool => tool.name === args.name)
      const crossStore = location === 'global'
        ? registry.currentWorkspaceTools().find(tool => tool.name === args.name)
        : globalTools.find(tool => tool.name === args.name)
      if (existing === undefined && crossStore !== undefined) {
        throw new Error('custom tool "' + args.name + '" already exists in the ' + (location === 'global' ? 'workspace' : 'global') + ' store; remove it there first')
      }

      const tool: CustomTool = {
        id: existing?.id ?? randomUUID(),
        name: args.name,
        description: args.description,
        parameters: args.parameters,
        code: args.code,
        scope: args.scope ?? 'global',
        location,
        enabled: args.enabled ?? true,
        source: 'model',
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      }
      validateTool(tool, config)

      if (location === 'global') {
        await authorizeGlobalCreation(ctx, tool, exec.rootCallId, exec.signal)
        const next = existing === undefined
          ? [...globalTools, tool]
          : globalTools.map(entry => entry.name === tool.name ? tool : entry)
        await scope.update({ tools: next })
        return { name: tool.name, replaced: existing !== undefined, location, total: next.length, enabled: tool.enabled }
      }

      const store = registry.currentWorkspaceTools()
      const next = existing === undefined
        ? [...store, tool]
        : store.map(entry => entry.name === tool.name ? tool : entry)
      const root = registry.writeCurrentWorkspaceTools(next)
      registry.reconcileWorkspace(root)
      return { name: tool.name, replaced: existing !== undefined, location, total: next.length, enabled: tool.enabled }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'custom_tool_remove',
    description: 'Prune a custom tool the MODEL created: unregister it immediately and remove it from durable storage. User-created tools (source user) are protected — you cannot remove them; ask the user to delete them in the settings UI instead.',
    parameters: {
      name: {
        type: 'string',
        required: true,
        description: 'The tool name as shown by custom_tools_list.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          location: { type: 'string', required: true },
          total: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: 'Custom tool "' + value.name + '" removed from ' + value.location + ' (now ' + value.total + ' tools there).' }],
    },
    async execute(args) {
      const globalTools = scope.get().tools
      const workspaceTools = registry.currentWorkspaceTools()
      const globalTarget = globalTools.find(tool => tool.name === args.name)
      const workspaceTarget = workspaceTools.find(tool => tool.name === args.name)
      const target = workspaceTarget ?? globalTarget
      if (target === undefined) throw new Error('no custom tool named "' + args.name + '"')
      if (target.source !== 'model') {
        throw new Error('custom tool "' + args.name + '" was created by the user and cannot be removed by the model; ask the user to delete it in the settings UI')
      }
      if (workspaceTarget !== undefined) {
        const next = workspaceTools.filter(tool => tool.name !== args.name)
        const root = registry.writeCurrentWorkspaceTools(next)
        registry.reconcileWorkspace(root)
        return { name: args.name, location: 'workspace', total: next.length }
      }
      const next = globalTools.filter(tool => tool.name !== args.name)
      await scope.update({ tools: next })
      return { name: args.name, location: 'global', total: next.length }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'custom_tools_list',
    description: 'List the current custom tools: name, description, source (user or model), scope, location, enabled state, last edit time, and any registration failure. Global-location tools plus this workspace\'s tools are shown.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tools: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string', required: true },
                description: { type: 'string', required: true },
                source: { type: 'string', required: true },
                scope: { type: 'string', required: true },
                location: { type: 'string', required: true },
                enabled: { type: 'boolean', required: true },
                updatedAt: { type: 'string', required: true },
                error: { type: 'string' },
              },
            },
          },
        },
      },
      render: (_args, value) => {
        const lines = value.tools.map((tool: { name: string; enabled: boolean; source: string; scope: string; location: string; description: string; error?: string }) => {
          const status = tool.error !== undefined && tool.error !== '' ? ' (registration failed: ' + tool.error + ')' : tool.enabled ? '' : ' (disabled)'
          return '- ' + tool.name + ' [' + tool.source + ' / scope ' + tool.scope + ' / ' + tool.location + ']' + status + ': ' + tool.description
        })
        return [{ type: 'text', text: lines.length === 0 ? 'No custom tools yet.' : lines.join('\n') }]
      },
    },
    async execute() {
      const failures = registry.errors()
      const globalTools = scope.get().tools
      const workspaceTools = registry.currentWorkspaceTools()
      const view = (tool: CustomTool) => ({
        name: tool.name,
        description: tool.description,
        source: tool.source,
        scope: tool.scope,
        location: tool.location,
        enabled: tool.enabled,
        updatedAt: tool.updatedAt,
        error: failures.get(tool.id) ?? '',
      })
      return { tools: [...globalTools.map(view), ...workspaceTools.map(view)] }
    },
  }))
}
