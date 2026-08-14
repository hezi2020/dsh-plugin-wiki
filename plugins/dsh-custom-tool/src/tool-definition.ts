/**
 * Projection of one stored custom tool into a registered {@link ToolDefinition}.
 */
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { assertSupportedJsonSchema, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import { runToolCode } from './executor.ts'
import type { CustomToolConfig } from './settings.ts'
import type { CustomTool } from './types.ts'

/** Minimal structural face of the agent registry's process-local initiator. */
export interface InitiatorLookup {
  currentInitiator(): { session: { header: { cwd: string } } } | undefined
}

/**
 * Render one canonical JSON return value as model-facing text, bounded to
 * `maxChars` so one oversized result cannot flood the context window.
 * @param value - the validated JSON value.
 * @param maxChars - the character budget.
 * @returns the result text.
 */
export function formatToolResult(value: unknown, maxChars: number): string {
  const text = typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? String(value))
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '\n…(result truncated at ' + maxChars + ' chars)'
}

/**
 * Build the registered definition for one stored tool.
 * @param tool - the stored tool record.
 * @param config - resolved plugin configuration.
 * @returns the registration-ready definition.
 */
export function buildCustomToolDefinition(
  tool: CustomTool,
  config: CustomToolConfig,
  workspaceRootProvider: () => string | undefined,
): ToolDefinition {
  assertSupportedJsonSchema(tool.parameters)
  const parameters = tool.parameters as unknown as Record<string, unknown>
  return {
    name: tool.name,
    description: tool.description,
    parameters,
    output: {
      schema: {},
      render: (_args, value) => [{ type: 'text', text: formatToolResult(value, config.maxResultChars) }] satisfies ContentBlock[],
    },
    timeoutMs: config.timeoutMs,
    execute(args, exec) {
      return runToolCode(tool.code, args, {
        timeoutMs: config.timeoutMs,
        memoryLimitMb: config.memoryLimitMb,
        allowNetwork: config.allowNetwork,
        scope: tool.scope,
        workspaceRoot: tool.scope === 'workspace' ? workspaceRootProvider() : undefined,
        env: { tool: tool.name, scope: tool.scope },
        signal: exec.signal,
      })
    },
  }
}

