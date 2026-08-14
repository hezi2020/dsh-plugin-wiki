import { describe, expect, it } from 'vitest'
import { createCustomToolViewStore, EMPTY_DRAFT } from '../src/client/store.ts'
import type { CustomTool } from '../src/types.ts'

const tool: CustomTool = {
  id: 't1',
  name: 'hello_tool',
  description: 'greets',
  parameters: { type: 'object', properties: {} },
  code: 'return 1',
  scope: 'global',
  location: 'global',
  enabled: true,
  source: 'user',
  createdAt: '',
  updatedAt: '',
}

describe('custom tool view store', () => {
  it('opens a create draft with defaults', () => {
    const store = createCustomToolViewStore().create()
    store.actions.openCreate()
    expect(store.getSnapshot().draft).toEqual(EMPTY_DRAFT)
  })

  it('opens an edit draft from a stored tool', () => {
    const store = createCustomToolViewStore().create()
    store.actions.openEdit(tool)
    expect(store.getSnapshot().draft).toMatchObject({ id: 't1', name: 'hello_tool', code: 'return 1' })
    expect(JSON.parse(store.getSnapshot().draft!.parametersText)).toEqual({ type: 'object', properties: {} })
  })

  it('updates the draft in place', () => {
    const store = createCustomToolViewStore().create()
    store.actions.openCreate()
    store.actions.updateDraft({ name: 'weather' })
    expect(store.getSnapshot().draft?.name).toBe('weather')
  })

  it('tracks save status transitions', () => {
    const store = createCustomToolViewStore().create()
    store.actions.setSaveStatus('saving')
    expect(store.getSnapshot().saveStatus).toBe('saving')
    store.actions.setSaveStatus('error', 'boom')
    expect(store.getSnapshot()).toMatchObject({ saveStatus: 'error', saveError: 'boom' })
  })

  it('closes the editor and resets save state', () => {
    const store = createCustomToolViewStore().create()
    store.actions.openEdit(tool)
    store.actions.setSaveStatus('error', 'boom')
    store.actions.closeEditor()
    expect(store.getSnapshot()).toMatchObject({ draft: null, saveStatus: 'idle', saveError: null })
  })

  it('tracks selection', () => {
    const store = createCustomToolViewStore().create()
    store.actions.select('t1')
    expect(store.getSnapshot().selectedId).toBe('t1')
  })
})
