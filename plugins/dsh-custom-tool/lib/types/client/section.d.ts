/**
 * The settings page: header, stored-tool list, and the create/edit editor.
 */
import type { ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import { LOCALE_NS } from './locales.ts';
import { createCustomToolViewStore } from './store.ts';
import type { CustomToolSectionInjected } from './types.ts';
type CustomToolSectionProps = PropsRuntime<'settings.section'> & PropsStore<ReturnType<typeof createCustomToolViewStore>> & InjectFace<CustomToolSectionInjected> & PropsLocale<typeof LOCALE_NS>;
/** The Custom Tool settings page. */
export declare function CustomToolSection(props: CustomToolSectionProps): ReactNode;
export {};
