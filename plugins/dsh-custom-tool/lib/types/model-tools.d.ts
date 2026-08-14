import type { Context } from '@deepseek-ai/cordis';
import type { SettingsScope } from '@deepseek-ai/dsh-settings';
import type { CustomToolRegistry } from './registry.ts';
import type { CustomToolConfig } from './settings.ts';
import type { CustomToolsSettings } from './types.ts';
/**
 * Register `custom_tool_create`, `custom_tool_remove`, and `custom_tools_list`.
 * @param ctx - the plugin context.
 * @param scope - the `custom-tools` settings owner scope.
 * @param config - resolved plugin configuration.
 * @param registry - the live registry supplying workspace stores and failures.
 */
export declare function registerModelTools(ctx: Context, scope: SettingsScope<CustomToolsSettings>, config: CustomToolConfig, registry: CustomToolRegistry): void;
