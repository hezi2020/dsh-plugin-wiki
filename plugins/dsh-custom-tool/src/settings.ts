/**
 * The `custom-tools` settings namespace: schema, configuration, and the write-time
 * validator every save (settings UI or model tool) passes before persisting.
 */
import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace, type SettingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import vm from 'node:vm'
import z from '@deepseek-ai/schemastery'
import { checkParametersSchema } from './shared/schema-check.ts'
import { toolNameError } from './shared/names.ts'
import type { CustomTool, CustomToolsSettings } from './types.ts'

export const CUSTOM_TOOLS_NAMESPACE = settingsNamespace('custom-tools')

/** Deployment-varying choices for the plugin; every field is cordis.yml-configurable. */
export interface CustomToolConfig {
  /** Wall-clock budget for one tool call, in milliseconds. */
  timeoutMs: number
  /** Worker-thread old-generation heap cap per tool call, in megabytes. */
  memoryLimitMb: number
  /** Character budget for the rendered result text. */
  maxResultChars: number
  /** UTF-8 byte budget for one tool body. */
  maxCodeBytes: number
  /** Maximum stored tools (enabled + disabled). */
  maxTools: number
  /** Whether tool bodies may reach the network through `fetch`. */
  allowNetwork: boolean
  /** Harness home for the per-workspace tool stores; empty means `$DSH_HOME` or `~/.dsh`. */
  dshHome: string
}

/** Schemastery validator for {@link CustomToolConfig}. */
export const Config: z<CustomToolConfig> = z.object({
  timeoutMs: z.number().default(30_000),
  memoryLimitMb: z.number().default(128),
  maxResultChars: z.number().default(16_000),
  maxCodeBytes: z.number().default(65_536),
  maxTools: z.number().default(100),
  allowNetwork: z.boolean().default(true),
  dshHome: z.string().default(''),
})

/** Schemastery schema of the `custom-tools` namespace section. */
export const CustomToolsSchema: z<CustomToolsSettings> = z.object({
  tools: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().default(''),
    parameters: z.any(),
    code: z.string(),
    scope: z.union(['global', 'workspace']).default('global'),
    location: z.union(['global', 'workspace']).default('global'),
    enabled: z.boolean().default(true),
    source: z.union(['user', 'model']).default('user'),
    createdAt: z.string().default(''),
    updatedAt: z.string().default(''),
  })).default([]),
})

/**
 * Reject one tool before it persists: name pattern and reservation, parameters
 * subset, description presence, code size, and code syntax. Shared by the
 * settings-write validator and `custom_tool_create`, so both paths admit
 * exactly the same tools.
 * @param tool - the candidate tool.
 * @param config - resolved plugin configuration.
 */
export function validateTool(tool: CustomTool, config: CustomToolConfig): void {
  const nameError = toolNameError(tool.name)
  if (nameError !== null) throw new Error(nameError)
  if (tool.description.trim() === '') throw new Error('tool "' + tool.name + '" needs a non-empty description — the model reads it to decide when to call')
  const check = checkParametersSchema(tool.parameters)
  if (!check.ok) throw new Error('tool "' + tool.name + '" parameters: ' + check.message + ' (at ' + check.path + ')')
  if (Buffer.byteLength(tool.code, 'utf8') > config.maxCodeBytes) {
    throw new Error('tool "' + tool.name + '" code exceeds ' + config.maxCodeBytes + ' bytes')
  }
  try {
    new vm.Script('(async (args, env) => {\n' + tool.code + '\n})', { filename: 'custom-tool:' + tool.name })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error('tool "' + tool.name + '" code syntax: ' + message)
  }
}

/**
 * Reject a whole settings section: count cap and per-tool constraints plus
 * duplicate ids and names within the section.
 * @param value - the resolved section.
 * @param config - resolved plugin configuration.
 */
export function validateCustomTools(value: CustomToolsSettings, config: CustomToolConfig): void {
  if (value.tools.length > config.maxTools) throw new Error('at most ' + config.maxTools + ' custom tools; got ' + value.tools.length)
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const tool of value.tools) {
    if (ids.has(tool.id)) throw new Error('duplicate tool id "' + tool.id + '"')
    if (names.has(tool.name)) throw new Error('duplicate tool name "' + tool.name + '"')
    ids.add(tool.id)
    names.add(tool.name)
    validateTool(tool, config)
  }
}

/**
 * Register the namespace with the settings provider and return its owner scope.
 * @param ctx - the plugin context.
 * @param config - resolved plugin configuration.
 * @returns the owner scope driving live tool registration.
 */
export function registerCustomToolsSettings(ctx: Context, config: CustomToolConfig): SettingsScope<CustomToolsSettings> {
  return ctx.settings.register(CUSTOM_TOOLS_NAMESPACE, CustomToolsSchema, {
    applies: 'live',
    validate: (value: CustomToolsSettings) => { validateCustomTools(value, config) },
  })
}

/** The branded namespace, for wire and client halves. */
export type { SettingsNamespace }

