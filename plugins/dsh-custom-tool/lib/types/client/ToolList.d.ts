import type { ReactNode } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { CustomTool } from '../types.ts';
import { LOCALE_NS } from './locales.ts';
export interface ToolListProps {
    t: TranslateNS<typeof LOCALE_NS>;
    tools: readonly CustomTool[];
    onEdit: (tool: CustomTool) => void;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
}
/** The stored-tool list: one card per tool with origin badge and row actions. */
export declare function ToolList(props: ToolListProps): ReactNode;
