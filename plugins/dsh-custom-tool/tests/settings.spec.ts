import { describe, expect, it } from 'vitest'
import { Config, CustomToolsSchema, validateCustomTools, validateTool } from '../src/settings.ts'
import type { CustomTool, CustomToolsSettings } from '../src/types.ts'

const CONFIG = {
  timeoutMs: 1000,
  memoryLimitMb: 128,
  maxResultChars: 16000,
  maxCodeBytes: 65536,
  maxTools: 100,
  allowNetwork: true,
  dshHome: '',
}

const config = Config(CONFIG)

const fixture: CustomTool = {
  id: 't1',
  name: 'hello_tool',
  description: 'greets a name',
  parameters: { type: 'object', properties: { who: { type: 'string' } }, required: ['who'] },
  code: 'return "hello " + args.who',
  scope: 'global',
  location: 'global',
  enabled: true,
  source: 'user',
  createdAt: '',
  updatedAt: '',
}

describe('CustomToolsSchema', () => {
  it('resolves defaults for omitted fields', () => {
    const resolved = CustomToolsSchema({ tools: [{ id: 't1', name: 'hello', description: 'd', parameters: { type: 'object', properties: {} }, code: 'return 1' }] } as unknown as CustomToolsSettings)
    expect(resolved.tools[0]).toMatchObject({ enabled: true, source: 'user', scope: 'global', createdAt: '', updatedAt: '' })
  })

  it('accepts an empty section', () => {
    expect(CustomToolsSchema({} as unknown as CustomToolsSettings).tools).toEqual([])
  })
})

describe('validateTool', () => {
  it('accepts a valid tool', () => {
    expect(() => validateTool(fixture, config)).not.toThrow()
  })

  it('rejects reserved and malformed names', () => {
    expect(() => validateTool({ ...fixture, name: 'custom_tool_create' }, config)).toThrow(/reserved/)
    expect(() => validateTool({ ...fixture, name: 'Bad-Name' }, config)).toThrow(/must match/)
  })

  it('rejects an empty description', () => {
    expect(() => validateTool({ ...fixture, description: '  ' }, config)).toThrow(/non-empty description/)
  })

  it('rejects parameters outside the subset', () => {
    expect(() => validateTool({ ...fixture, parameters: { type: 'object', pattern: 'x' } }, config)).toThrow(/parameters/)
  })

  it('rejects oversized code', () => {
    const tiny = Config({ ...CONFIG, maxCodeBytes: 10 })
    expect(() => validateTool({ ...fixture, code: 'return "0123456789x"' }, tiny)).toThrow(/exceeds 10 bytes/)
  })

  it('rejects syntactically broken code', () => {
    expect(() => validateTool({ ...fixture, code: 'return { broken' }, config)).toThrow(/syntax/)
  })
})

describe('validateCustomTools', () => {
  it('rejects duplicate ids and names within a section', () => {
    expect(() => validateCustomTools({ tools: [fixture, { ...fixture, name: 'other' }] }, config)).toThrow(/duplicate tool id/)
    expect(() => validateCustomTools({ tools: [fixture, { ...fixture, id: 't2' }] }, config)).toThrow(/duplicate tool name/)
  })

  it('enforces the tool count cap', () => {
    const capped = Config({ ...CONFIG, maxTools: 1 })
    expect(() => validateCustomTools({ tools: [fixture, { ...fixture, id: 't2', name: 'other' }] }, capped)).toThrow(/at most 1 custom tools/)
  })
})
