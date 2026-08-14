/**
 * The section's viewing store: selection, editor draft, and save status.
 * Module level exports the factory only, per the client store discipline.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import type { CustomTool } from '../types.ts'
import type { CustomToolDraft } from './types.ts'

/** Store state: shared viewing/interaction facts, never business data. */
export interface CustomToolViewState {
  selectedId: string | null
  draft: CustomToolDraft | null
  saveStatus: 'idle' | 'saving' | 'error'
  saveError: string | null
}

type CustomToolViewActions = {
  select: (draft: CustomToolViewState, id: string | null) => void
  openCreate: (draft: CustomToolViewState) => void
  openEdit: (draft: CustomToolViewState, tool: CustomTool) => void
  updateDraft: (draft: CustomToolViewState, patch: Partial<CustomToolDraft>) => void
  closeEditor: (draft: CustomToolViewState) => void
  setSaveStatus: (draft: CustomToolViewState, status: CustomToolViewState['saveStatus'], error?: string | null) => void
}

/** Initial draft for a brand-new tool. */
export const EMPTY_DRAFT: CustomToolDraft = {
  id: null,
  name: '',
  description: '',
  parametersText: '{\n  "type": "object",\n  "properties": {}\n}\n',
  code: 'return { message: \'hello from \' + args.name }\n',
  scope: 'global',
  location: 'global',
}

/**
 * Create the section viewing store handle.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createCustomToolViewStore(): EngineStoreHandle<CustomToolViewState, CustomToolViewActions> {
  return defineStore({
    init: (): CustomToolViewState => ({ selectedId: null, draft: null, saveStatus: 'idle', saveError: null }),
    persist: 'dsh.custom-tool.view.v1',
    actions: {
      select: (d, id) => { d.selectedId = id },
      openCreate: (d) => {
        d.draft = { ...EMPTY_DRAFT }
        d.selectedId = null
        d.saveStatus = 'idle'
        d.saveError = null
      },
      openEdit: (d, tool) => {
        d.draft = {
          id: tool.id,
          name: tool.name,
          description: tool.description,
          parametersText: JSON.stringify(tool.parameters, null, 2),
          code: tool.code,
          scope: tool.scope ?? 'global',
          location: tool.location ?? 'global',
        }
        d.selectedId = tool.id
        d.saveStatus = 'idle'
        d.saveError = null
      },
      updateDraft: (d, patch) => {
        if (d.draft !== null) d.draft = { ...d.draft, ...patch }
      },
      closeEditor: (d) => {
        d.draft = null
        d.saveStatus = 'idle'
        d.saveError = null
      },
      setSaveStatus: (d, status, error = null) => {
        d.saveStatus = status
        d.saveError = error
      },
    },
  })
}
