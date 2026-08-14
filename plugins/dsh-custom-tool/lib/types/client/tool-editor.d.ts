/**
 * The tool editor form: name, description, parameter schema (JSON text with
 * live subset validation), and the Monaco code editor with per-tool
 * intellisense. Pure presentation — every input routes through `onChange`.
 * @module dsh-custom-tool/client/tool-editor
 */
import { type ReactNode } from 'react';
import type { CustomToolDraft } from './injected.ts';
interface ToolEditorPanelProps {
    draft: CustomToolDraft;
    saveStatus: 'idle' | 'saving' | 'error';
    saveError: string | null;
    theme: 'light' | 'dark';
    onChange(patch: Partial<CustomToolDraft>): void;
    onSave(): void;
    onCancel(): void;
}
/**
 * Render the editor form for one draft.
 * @param props - draft, save state, theme, and the three callbacks.
 * @returns the form.
 */
export declare function ToolEditorPanel(props: ToolEditorPanelProps): ReactNode;
export {};
