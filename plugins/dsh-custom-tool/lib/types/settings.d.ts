/**
 * The `custom-tools` settings namespace: schema, configuration, and the write-time
 * validator every save (settings UI or model tool) passes before persisting.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type SettingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings';
import z from '@deepseek-ai/schemastery';
import type { CustomTool, CustomToolsSettings } from './types.ts';
export declare const CUSTOM_TOOLS_NAMESPACE: SettingsNamespace;
/** Deployment-varying choices for the plugin; every field is cordis.yml-configurable. */
export interface CustomToolConfig {
    /** Wall-clock budget for one tool call, in milliseconds. */
    timeoutMs: number;
    /** Worker-thread old-generation heap cap per tool call, in megabytes. */
    memoryLimitMb: number;
    /** Character budget for the rendered result text. */
    maxResultChars: number;
    /** UTF-8 byte budget for one tool body. */
    maxCodeBytes: number;
    /** Maximum stored tools (enabled + disabled). */
    maxTools: number;
    /** Whether tool bodies may reach the network through `fetch`. */
    allowNetwork: boolean;
    /** Harness home for the per-workspace tool stores; empty means `$DSH_HOME` or `~/.dsh`. */
    dshHome: string;
}
/** Schemastery validator for {@link CustomToolConfig}. */
export declare const Config: z<CustomToolConfig>;
/** Schemastery schema of the `custom-tools` namespace section. */
export declare const CustomToolsSchema: z<CustomToolsSettings>;
/**
 * Reject one tool before it persists: name pattern and reservation, parameters
 * subset, description presence, code size, and code syntax. Shared by the
 * settings-write validator and `custom_tool_create`, so both paths admit
 * exactly the same tools.
 * @param tool - the candidate tool.
 * @param config - resolved plugin configuration.
 */
export declare function validateTool(tool: CustomTool, config: CustomToolConfig): void;
/**
 * Reject a whole settings section: count cap and per-tool constraints plus
 * duplicate ids and names within the section.
 * @param value - the resolved section.
 * @param config - resolved plugin configuration.
 */
export declare function validateCustomTools(value: CustomToolsSettings, config: CustomToolConfig): void;
/**
 * Register the namespace with the settings provider and return its owner scope.
 * @param ctx - the plugin context.
 * @param config - resolved plugin configuration.
 * @returns the owner scope driving live tool registration.
 */
export declare function registerCustomToolsSettings(ctx: Context, config: CustomToolConfig): SettingsScope<CustomToolsSettings>;
/** The branded namespace, for wire and client halves. */
export type { SettingsNamespace };
