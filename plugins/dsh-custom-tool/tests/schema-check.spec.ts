import { describe, expect, it } from 'vitest'
import { checkParametersSchema, checkSchemaNode, isJsonSafe } from '../src/shared/schema-check.ts'

describe('isJsonSafe', () => {
  it('accepts plain JSON data', () => {
    expect(isJsonSafe({ a: [1, 'x', null, true] })).toBe(true)
    expect(isJsonSafe(0)).toBe(true)
  })

  it('rejects non-finite numbers, undefined, and functions', () => {
    expect(isJsonSafe(Number.NaN)).toBe(false)
    expect(isJsonSafe(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isJsonSafe(undefined)).toBe(false)
    expect(isJsonSafe({ f: () => 1 })).toBe(false)
  })
})

describe('checkParametersSchema', () => {
  it('accepts an object root with properties', () => {
    const schema = { type: 'object', properties: { who: { type: 'string', description: 'name' } }, required: ['who'] }
    expect(checkParametersSchema(schema)).toEqual({ ok: true })
  })

  it('accepts nested arrays and enums', () => {
    const schema = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        kind: { type: 'string', enum: ['a', 'b'] },
      },
    }
    expect(checkParametersSchema(schema)).toEqual({ ok: true })
  })

  it('rejects a non-object root', () => {
    expect(checkParametersSchema({ type: 'string' })).toMatchObject({ ok: false, path: '$' })
  })

  it('rejects unknown keywords', () => {
    expect(checkParametersSchema({ type: 'object', pattern: 'x' })).toMatchObject({ ok: false, message: expect.stringContaining('pattern') })
  })

  it('rejects required names absent from properties', () => {
    const result = checkParametersSchema({ type: 'object', properties: {}, required: ['who'] })
    expect(result.ok).toBe(false)
  })

  it('rejects items without an array type', () => {
    expect(checkSchemaNode({ type: 'string', items: { type: 'string' } }).ok).toBe(false)
  })

  it('rejects oneOf with a single branch and reports nested paths', () => {
    const result = checkParametersSchema({
      type: 'object',
      properties: { x: { oneOf: [{ type: 'string' }] } },
    })
    expect(result).toMatchObject({ ok: false, path: '$.properties.x.oneOf' })
  })

  it('rejects enum entries that are objects', () => {
    expect(checkSchemaNode({ type: 'string', enum: [{ a: 1 }] }).ok).toBe(false)
  })

  it('rejects non-JSON default values', () => {
    expect(checkSchemaNode({ type: 'number', default: Number.NaN }).ok).toBe(false)
  })
})
