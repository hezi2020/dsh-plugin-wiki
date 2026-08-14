import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
import type { CustomToolsSettings } from '../types.ts';
/** Editor draft for one tool: raw parameter-schema text and code. */
export interface CustomToolDraft {
    /** Existing tool id when editing; null when creating. */
    id: string | null;
    name: string;
    description: string;
    /** Raw JSON Schema text; parsed and subset-checked before saving. */
    parametersText: string;
    code: string;
    /** Execution scope: 'global' (sandbox only) or 'workspace' (+ confined fs). */
    scope: 'global' | 'workspace';
    /** Storage location: 'global' (all workspaces) or 'workspace' (current workspace). */
    location: 'global' | 'workspace';
}
/** Bare observable source face for the hooks compartment (stable identity, stable snapshots). */
export interface ObservableSource<T> {
    getSnapshot(): T;
    subscribe(listener: () => void): () => void;
}
/** What the section receives beyond the four props shares. */
export interface CustomToolSectionInjected {
    hooks: {
        /** The bound custom-tools settings scope (reactive durable section). */
        scope: SettingsScope<CustomToolsSettings>;
        /** Resolved editor theme: 'light' or 'dark'. */
        theme: ObservableSource<string>;
    };
    /** Validate, persist, and close the editor on success. */
    save: (draft: CustomToolDraft) => Promise<void>;
    /** Flip one tool's enabled flag through the settings scope. */
    toggleEnabled: (id: string) => Promise<void>;
    /** Delete one tool through the settings scope. */
    remove: (id: string) => Promise<void>;
}
/** Client-side validation outcome for one draft. */
export interface DraftValidation {
    error: string | null;
    parameters: unknown | null;
}
