import { describe, expect, it } from 'vitest'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import { saveTool } from '../src/client/index.ts'
import { validateDraft } from '../src/client/validate.ts'
import { zh } from '../src/client/locales.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key
import type { CustomToolDraft } from '../src/client/types.ts'
import type { CustomTool, CustomToolsSettings } from '../src/types.ts'

const draft: CustomToolDraft = {
  id: null,
  name: 'hello_tool',
  description: 'greets',
  parametersText: JSON.stringify({ type: 'object', properties: { who: { type: 'string' } }, required: ['who'] }),
  code: 'return "hello " + args.who',
  scope: 'global',
  location: 'global',
}

describe('validateDraft', () => {
  it('accepts a valid draft', () => {
    expect(validateDraft(t, draft)).toMatchObject({ error: null })
  })

  it('rejects reserved names', () => {
    expect(validateDraft(t, { ...draft, name: 'custom_tool_create' }).error).toMatch(/reserved/)
  })

  it('rejects malformed parameter JSON', () => {
    expect(validateDraft(t, { ...draft, parametersText: '{nope' }).error).toMatch(/不是合法 JSON/)
  })

  it('rejects parameters outside the subset', () => {
    const result = validateDraft(t, { ...draft, parametersText: '{"type":"object","pattern":"x"}' })
    expect(result.error).toMatch(/参数 schema/)
  })

  it('rejects broken code syntax', () => {
    expect(validateDraft(t, { ...draft, code: 'return { broken' }).error).toMatch(/代码语法错误/)
  })
})

describe('saveTool', () => {
  it('persists a new tool through the scope', async () => {
    const writes: Array<{ field: string; value: unknown }> = []
    const scope = {
      getSnapshot: () => ({ value: { tools: [] } }),
      set: async (field: string, value: unknown) => { writes.push({ field, value }) },
    } as unknown as SettingsScope<CustomToolsSettings>

    await saveTool(scope, t, draft)
    expect(writes).toHaveLength(1)
    expect(writes[0].field).toBe('tools')
    const tools = writes[0].value as CustomTool[]
    expect(tools).toHaveLength(1)
    expect(tools[0]).toMatchObject({ name: 'hello_tool', source: 'user', enabled: true })
    expect(tools[0].id).toMatch(/[0-9a-f-]{36}/)
  })

  it('rejects duplicate names on create', async () => {
    const scope = {
      getSnapshot: () => ({ value: { tools: [{ ...draft, id: 't1', enabled: true, source: 'user', createdAt: '', updatedAt: '', parameters: JSON.parse(draft.parametersText) }] } }),
      set: async () => {},
    } as unknown as SettingsScope<CustomToolsSettings>
    await expect(saveTool(scope, t, draft)).rejects.toThrow(/已存在/)
  })

  it('preserves identity fields on edit', async () => {
    const existing: CustomTool = {
      id: 't1',
      name: 'hello_tool',
      description: 'greets',
      parameters: { type: 'object', properties: {} },
      code: 'return 1',
      scope: 'global',
      location: 'global',
      enabled: false,
      source: 'model',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const writes: Array<{ value: unknown }> = []
    const scope = {
      getSnapshot: () => ({ value: { tools: [existing] } }),
      set: async (_field: string, value: unknown) => { writes.push({ value }) },
    } as unknown as SettingsScope<CustomToolsSettings>

    await saveTool(scope, t, { ...draft, id: 't1', name: 'hello_tool' })
    const saved = (writes[0].value as CustomTool[])[0]
    expect(saved).toMatchObject({ id: 't1', source: 'model', enabled: false, createdAt: '2026-01-01T00:00:00.000Z' })
    expect(saved.updatedAt).not.toBe('2026-01-01T00:00:00.000Z')
  })
})
