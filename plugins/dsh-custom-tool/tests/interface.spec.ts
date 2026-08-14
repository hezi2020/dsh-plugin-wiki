import { describe, expect, it } from 'vitest'
import { argsExtraLib } from '../src/shared/interface.ts'

describe('argsExtraLib', () => {
  it('types required and optional fields', () => {
    const lib = argsExtraLib({
      type: 'object',
      properties: {
        who: { type: 'string' },
        count: { type: 'integer' },
        active: { type: 'boolean' },
      },
      required: ['who'],
    })
    expect(lib).toContain('declare const args: {')
    expect(lib).toContain('who: string')
    expect(lib).toContain('count?: number')
    expect(lib).toContain('active?: boolean')
  })

  it('types arrays and enum unions', () => {
    const lib = argsExtraLib({
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        kind: { type: 'string', enum: ['a', 'b'] },
      },
    })
    expect(lib).toContain('tags?: (string)[]')
    expect(lib).toContain('kind?: "a" | "b"')
  })

  it('types nested objects and oneOf unions', () => {
    const lib = argsExtraLib({
      type: 'object',
      properties: {
        nested: {
          type: 'object',
          properties: { deep: { type: 'number' } },
          required: ['deep'],
        },
        pick: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      },
    })
    expect(lib).toContain('deep: number')
    expect(lib).toContain('pick?: string | number')
  })

  it('falls back to a record for empty properties', () => {
    const lib = argsExtraLib({ type: 'object', properties: {} })
    expect(lib).toContain('Record<string, unknown>')
  })
})
