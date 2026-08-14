/**
 * Pure conversions between a parameters JSON Schema (object root) and the
 * editable parameter-row GUI model. Properties the GUI does not model
 * (nested objects, oneOf, non-string enums) stay in `extras` and round-trip
 * verbatim, so switching between GUI and advanced editing loses nothing.
 */

export const PARAMETER_TYPES = ['string', 'number', 'integer', 'boolean', 'null', 'object', 'array'] as const
export type ParameterType = (typeof PARAMETER_TYPES)[number]

export const ARRAY_ITEM_TYPES = ['string', 'number', 'integer', 'boolean', 'null'] as const
export type ArrayItemType = (typeof ARRAY_ITEM_TYPES)[number]

/** One GUI-editable parameter row. */
export interface ParameterRow {
  name: string
  type: ParameterType
  required: boolean
  description: string
  /** Comma-separated allowed values; string type only. */
  enumText: string
  /** Array element type; array type only. */
  itemsType: ArrayItemType
}

export const PARAMETER_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/** A fresh empty row for the 添加参数 button. */
export function newParameterRow(): ParameterRow {
  return { name: '', type: 'string', required: false, description: '', enumText: '', itemsType: 'string' }
}

function isParameterType(value: string): value is ParameterType {
  return (PARAMETER_TYPES as readonly string[]).includes(value)
}

function isArrayItemType(value: string): value is ArrayItemType {
  return (ARRAY_ITEM_TYPES as readonly string[]).includes(value)
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** All-string enum values, or null when absent or not GUI-modeled. */
function stringEnumOf(node: Record<string, unknown>): string[] | null {
  if (!Array.isArray(node.enum)) return null
  if (node.enum.some(value => typeof value !== 'string')) return null
  return node.enum as string[]
}

/** Whether the GUI models this property node; complex nodes stay in extras. */
function isModeled(node: Record<string, unknown>): boolean {
  if (node.oneOf !== undefined || node.const !== undefined) return false
  if (typeof node.type !== 'string' || !isParameterType(node.type)) return false
  if (node.type === 'string') {
    if (node.enum !== undefined && stringEnumOf(node) === null) return false
  } else if (node.enum !== undefined) {
    return false
  }
  if (node.type === 'array') {
    if (node.items === undefined) return true
    const items = node.items as Record<string, unknown>
    if (typeof items.type !== 'string' || !isArrayItemType(items.type) || items.oneOf !== undefined) return false
  }
  if (node.type === 'object') {
    // Bare objects only; nested properties need the advanced editor.
    return node.properties === undefined
  }
  return true
}

/** The GUI model of one parameters schema: editable rows plus preserved extras. */
export interface ParametersModel {
  rows: ParameterRow[]
  /** Properties the GUI does not model; preserved verbatim across edits. */
  extras: Record<string, unknown>
  /** Required entries owned by extras; re-emitted so complex props keep their required flag. */
  extrasRequired: string[]
  /** The original required order, restored on serialization for byte-stable round-trips. */
  requiredOrder: string[]
}

/**
 * Split a subset-valid parameters schema into editable rows plus preserved extras.
 * @param schema - the parameters JSON Schema (object root).
 * @returns the GUI model.
 */
export function modelFromParameters(schema: unknown): ParametersModel {
  const extras: Record<string, unknown> = {}
  const extrasRequired: string[] = []
  const rows: ParameterRow[] = []
  const requiredOrder: string[] = isObjectRecord(schema) && Array.isArray(schema.required)
    ? (schema.required as string[]).filter(name => typeof name === 'string')
    : []
  if (isObjectRecord(schema) && isObjectRecord(schema.properties)) {
    const required = new Set<string>(requiredOrder)
    for (const [name, rawNode] of Object.entries(schema.properties)) {
      if (!isObjectRecord(rawNode) || !isModeled(rawNode)) {
        extras[name] = rawNode
        if (required.has(name)) extrasRequired.push(name)
        continue
      }
      rows.push({
        name,
        type: rawNode.type as ParameterType,
        required: required.has(name),
        description: typeof rawNode.description === 'string' ? rawNode.description : '',
        enumText: stringEnumOf(rawNode)?.join(', ') ?? '',
        itemsType: rawNode.type === 'array' && isObjectRecord(rawNode.items) && typeof rawNode.items.type === 'string' && isArrayItemType(rawNode.items.type)
          ? rawNode.items.type
          : 'string',
      })
    }
  }
  return { rows, extras, extrasRequired, requiredOrder }
}

/**
 * Serialize rows plus preserved extras back to the object-root JSON Schema.
 * @param model - the GUI model.
 * @returns the schema value.
 */
export function parametersFromModel(model: ParametersModel): Record<string, unknown> {
  const properties: Record<string, unknown> = { ...model.extras }
  const requiredSet = new Set<string>(model.extrasRequired.filter(name => name in model.extras))
  for (const row of model.rows) {
    const name = row.name.trim()
    if (name === '') continue
    const node: Record<string, unknown> = { type: row.type }
    if (row.description.trim() !== '') node.description = row.description.trim()
    if (row.type === 'string') {
      const values = row.enumText.split(',').map(value => value.trim()).filter(value => value !== '')
      if (values.length > 0) node.enum = values
    }
    if (row.type === 'array') node.items = { type: row.itemsType }
    properties[name] = node
    if (row.required) requiredSet.add(name)
  }
  // Restore the original required order where names survive; newly required rows follow.
  const required = model.requiredOrder.filter(name => requiredSet.has(name))
  for (const name of requiredSet) {
    if (!required.includes(name)) required.push(name)
  }
  const schema: Record<string, unknown> = { type: 'object', properties }
  if (required.length > 0) schema.required = required
  return schema
}

/**
 * Row-level validation for the GUI: non-empty unique names matching the
 * pattern, reported in the active locale.
 * @param t - the locale translator.
 * @param rows - the current rows.
 * @returns the first user-facing error, or null.
 */
export function validateRows(t: (key: string) => string, rows: readonly ParameterRow[]): string | null {
  const seen = new Set<string>()
  for (const row of rows) {
    const name = row.name.trim()
    if (name === '') return t('err.nameEmpty')
    if (!PARAMETER_NAME_PATTERN.test(name)) return (t('err.namePattern') as string).replace('{name}', name)
    if (seen.has(name)) return (t('err.nameDup') as string).replace('{name}', name)
    seen.add(name)
  }
  return null
}

