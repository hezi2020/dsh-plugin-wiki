/**
 * dsh-custom-tool host half: registers the `custom-tools` settings namespace,
 * mirrors its enabled tools into `ctx.tools` (whose schemas the system prompt
 * assembles automatically), exposes the model-facing management toolset, and
 * injects the custom-tool guidance section into the system prompt.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type CustomToolConfig } from './settings.ts';
export { Config } from './settings.ts';
export type { CustomToolConfig } from './settings.ts';
export type { CustomTool, CustomToolsSettings } from './types.ts';
export { CUSTOM_TOOLS_NAMESPACE } from './settings.ts';
export declare const name = "dsh-custom-tool";
export declare const inject: string[];
/**
 * Mount the plugin: settings namespace, live tool registry, model toolset, prompt section.
 * @param ctx - the plugin context.
 * @param config - schemastery-resolved {@link CustomToolConfig}.
 */
export declare function apply(ctx: Context, config: CustomToolConfig): void;
