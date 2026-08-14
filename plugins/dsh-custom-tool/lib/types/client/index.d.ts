/**
 * dsh-custom-tool browser half: the 自定义工具 settings section with the Monaco
 * editor, bound to the durable `custom-tools` settings namespace through the
 * harness settings scope.
 */
import type { ClientContext, SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { CustomToolsSettings } from '../types.ts';
import { LOCALE_NS } from './locales.ts';
import type { CustomToolDraft } from './types.ts';
export declare const inject: string[];
/** Build and persist one tool record through the settings scope. */
export declare function saveTool(scope: SettingsScope<CustomToolsSettings>, t: TranslateNS<typeof LOCALE_NS>, draft: CustomToolDraft): Promise<void>;
/**
 * Mount the settings section.
 * @param ctx - the client root context.
 */
export declare function apply(ctx: ClientContext): void;
