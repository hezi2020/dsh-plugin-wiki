import type { ReactNode } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { LOCALE_NS } from './locales.ts';
import type { CustomToolDraft } from './types.ts';
export interface EditorPanelProps {
    t: TranslateNS<typeof LOCALE_NS>;
    draft: CustomToolDraft;
    saveStatus: 'idle' | 'saving' | 'error';
    saveError: string | null;
    theme: 'light' | 'dark';
    onUpdate: (patch: Partial<CustomToolDraft>) => void;
    onSave: () => void;
    onCancel: () => void;
}
/** The create/edit form: identity fields, parameters schema, and the Monaco editor. */
export declare function EditorPanel(props: EditorPanelProps): ReactNode;
