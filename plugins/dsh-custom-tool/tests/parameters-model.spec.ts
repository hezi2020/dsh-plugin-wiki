import { describe, expect, it } from 'vitest'
import { modelFromParameters, parametersFromModel, validateRows, newParameterRow } from '../src/client/parameters-model.ts'
import { zh } from '../src/client/locales.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

describe('modelFromParameters', () => {
  it('turns simple properties into rows', () => {
    const model = modelFromParameters({
      type: 'object',
      properties: {
        who: { type: 'string', description: 'name' },
        count: { type: 'integer' },
        active: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
        kind: { type: 'string', enum: ['a', 'b'] },
      },
      required: ['who', 'count'],
    })
    expect(model.rows).toEqual([
      { name: 'who', type: 'string', required: true, description: 'name', enumText: '', itemsType: 'string' },
      { name: 'count', type: 'integer', required: true, description: '', enumText: '', itemsType: 'string' },
      { name: 'active', type: 'boolean', required: false, description: '', enumText: '', itemsType: 'string' },
      { name: 'tags', type: 'array', required: false, description: '', enumText: '', itemsType: 'string' },
      { name: 'kind', type: 'string', required: false, description: '', enumText: 'a, b', itemsType: 'string' },
    ])
    expect(model.extras).toEqual({})
  })

  it('preserves complex properties in extras with their required flag', () => {
    const model = modelFromParameters({
      type: 'object',
      properties: {
        plain: { type: 'string' },
        nested: { type: 'object', properties: { deep: { type: 'number' } }, required: ['deep'] },
        pick: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        codes: { type: 'string', enum: ['x', 1] },
      },
      required: ['nested', 'plain'],
    })
    expect(model.rows.map(row => row.name)).toEqual(['plain'])
    expect(Object.keys(model.extras)).toEqual(['nested', 'pick', 'codes'])
    expect(model.extrasRequired).toEqual(['nested'])
  })

  it('tolerates invalid or empty input', () => {
    expect(modelFromParameters(null)).toEqual({ rows: [], extras: {}, extrasRequired: [], requiredOrder: [] })
    expect(modelFromParameters({ type: 'string' })).toEqual({ rows: [], extras: {}, extrasRequired: [], requiredOrder: [] })
  })
})

describe('parametersFromModel', () => {
  it('serializes rows with required, enum, and array items', () => {
    const schema = parametersFromModel({
      rows: [
        { ...newParameterRow(), name: 'who', required: true, description: 'name' },
        { ...newParameterRow(), name: 'kind', enumText: 'a, b,  c ' },
        { ...newParameterRow(), name: 'tags', type: 'array', itemsType: 'integer' },
      ],
      extras: {},
      extrasRequired: [],
      requiredOrder: [],
    })
    expect(schema).toEqual({
      type: 'object',
      properties: {
        who: { type: 'string', description: 'name' },
        kind: { type: 'string', enum: ['a', 'b', 'c'] },
        tags: { type: 'array', items: { type: 'integer' } },
      },
      required: ['who'],
    })
  })

  it('skips unnamed rows and empty descriptions', () => {
    const schema = parametersFromModel({
      rows: [{ ...newParameterRow(), name: '  ' }, { ...newParameterRow(), name: 'ok', description: '  ' }],
      extras: {},
      extrasRequired: [],
      requiredOrder: [],
    })
    expect(schema).toEqual({ type: 'object', properties: { ok: { type: 'string' } } })
  })

  it('round-trips a schema through model and back', () => {
    const original = {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'the city' },
        meta: { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] },
      },
      required: ['city', 'meta'],
    }
    const restored = parametersFromModel(modelFromParameters(original))
    expect(restored).toEqual(original)
  })
})

describe('validateRows', () => {
  it('accepts unique well-formed names', () => {
    expect(validateRows(t, [{ ...newParameterRow(), name: 'city' }, { ...newParameterRow(), name: 'n2' }])).toBeNull()
  })

  it('rejects empty, malformed, and duplicate names', () => {
    expect(validateRows(t, [newParameterRow()])).toMatch(/不能为空/)
    expect(validateRows(t, [{ ...newParameterRow(), name: '2bad' }])).toMatch(/下划线开头/)
    expect(validateRows(t, [{ ...newParameterRow(), name: 'x' }, { ...newParameterRow(), name: 'x' }])).toMatch(/重复/)
  })
})

