/**
 * Browser-half contract types: the draft under edit and the inject face the
 * settings section component consumes through the slot system.
 * @module dsh-custom-tool/client/injected
 */
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
import type { CustomTool, CustomToolsSettings } from '../types.ts';
/** One editable tool under the settings form; `id: null` means "creating". */
export interface CustomToolDraft {
    id: string | null;
    name: string;
    description: string;
    /** Raw JSON text of the parameter schema; parsed and checked on save. */
    parametersText: string;
    code: string;
}
/** Result of one durable write: success, or the first user-facing rejection. */
export type SaveOutcome = {
    ok: true;
} | {
    ok: false;
    error: string;
};
/** The light/dark preference the Monaco editor follows. */
export interface ThemeMirror {
    getSnapshot(): 'light' | 'dark';
    subscribe(listener: () => void): () => void;
}
/** The inject face of the `settings.section` entry. */
export interface CustomToolSectionInjected {
    /** Validate and persist one draft through the settings scope. */
    save(draft: CustomToolDraft): Promise<SaveOutcome>;
    /** Delete one stored tool. */
    removeTool(tool: CustomTool): Promise<SaveOutcome>;
    /** Enable or disable one stored tool; a change re-registers it live. */
    setEnabled(tool: CustomTool, enabled: boolean): Promise<SaveOutcome>;
    hooks: {
        /** The durable settings scope; the section renders its snapshot. */
        settings: SettingsScope<CustomToolsSettings>;
        /** The theme preference the editor follows. */
        theme: ThemeMirror;
    };
}
