import { type ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { CustomToolConfig } from './settings.ts';
import type { CustomTool } from './types.ts';
/** Minimal structural face of the agent registry's process-local initiator. */
export interface InitiatorLookup {
    currentInitiator(): {
        session: {
            header: {
                cwd: string;
            };
        };
    } | undefined;
}
/**
 * Render one canonical JSON return value as model-facing text, bounded to
 * `maxChars` so one oversized result cannot flood the context window.
 * @param value - the validated JSON value.
 * @param maxChars - the character budget.
 * @returns the result text.
 */
export declare function formatToolResult(value: unknown, maxChars: number): string;
/**
 * Build the registered definition for one stored tool.
 * @param tool - the stored tool record.
 * @param config - resolved plugin configuration.
 * @returns the registration-ready definition.
 */
export declare function buildCustomToolDefinition(tool: CustomTool, config: CustomToolConfig, workspaceRootProvider: () => string | undefined): ToolDefinition;
