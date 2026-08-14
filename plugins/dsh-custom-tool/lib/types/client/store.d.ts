/**
 * The section's viewing store: selection, editor draft, and save status.
 * Module level exports the factory only, per the client store discipline.
 */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client';
import type { CustomTool } from '../types.ts';
import type { CustomToolDraft } from './types.ts';
/** Store state: shared viewing/interaction facts, never business data. */
export interface CustomToolViewState {
    selectedId: string | null;
    draft: CustomToolDraft | null;
    saveStatus: 'idle' | 'saving' | 'error';
    saveError: string | null;
}
type CustomToolViewActions = {
    select: (draft: CustomToolViewState, id: string | null) => void;
    openCreate: (draft: CustomToolViewState) => void;
    openEdit: (draft: CustomToolViewState, tool: CustomTool) => void;
    updateDraft: (draft: CustomToolViewState, patch: Partial<CustomToolDraft>) => void;
    closeEditor: (draft: CustomToolViewState) => void;
    setSaveStatus: (draft: CustomToolViewState, status: CustomToolViewState['saveStatus'], error?: string | null) => void;
};
/** Initial draft for a brand-new tool. */
export declare const EMPTY_DRAFT: CustomToolDraft;
/**
 * Create the section viewing store handle.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export declare function createCustomToolViewStore(): EngineStoreHandle<CustomToolViewState, CustomToolViewActions>;
export {};
