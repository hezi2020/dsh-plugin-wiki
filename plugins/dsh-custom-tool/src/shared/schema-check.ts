/**
 * The enforced JSON Schema subset for custom-tool `parameters`, mirroring the
 * rules of `@deepseek-ai/dsh-tools`'s `assertSupportedJsonSchema`. The host
 * re-checks at registration; this checker runs earlier — at settings-write and
 * client-save time — so the user learns about violations before anything persists.
 */

/** Accepted scalar type names for a node. */
const TYPES = new Set(['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'])

/** Annotation and constraint keywords the subset admits. */
const KEYWORDS = new Set([
  'type', 'properties', 'required', 'items', 'enum', 'const',
  'description', 'title', 'default', 'examples', 'oneOf', 'additionalProperties',
])

/** Whether a value is lossless-JSON-safe (finite numbers, no cycles, no functions). */
export function isJsonSafe(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(entry => isJsonSafe(entry))
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (!isJsonSafe((value as Record<string, unknown>)[key])) return false
    }
    return true
  }
  return false
}

export type SchemaCheckResult = { ok: true } | { ok: false; path: string; message: string }

function fail(path: string, message: string): SchemaCheckResult {
  return { ok: false, path, message }
}

function jsonPath(path: string, segment: string): string {
  return path + '.' + segment
}

/**
 * Check one schema node against the subset.
 * @param schema - the node value.
 * @param path - JSON path of the node in the root schema, for error reporting.
 * @returns ok, or the first violation with its path.
 */
export function checkSchemaNode(schema: unknown, path = '$'): SchemaCheckResult {
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    return fail(path, 'must be an object with allowed keywords')
  }
  const node = schema as Record<string, unknown>
  for (const key of Object.keys(node)) {
    if (!KEYWORDS.has(key)) return fail(jsonPath(path, key), 'keyword "' + key + '" is not supported; use only ' + [...KEYWORDS].sort().join(', '))
  }
  if (node.type !== undefined) {
    if (typeof node.type !== 'string' || !TYPES.has(node.type)) {
      return fail(jsonPath(path, 'type'), 'must be one of ' + [...TYPES].sort().join(', '))
    }
  }
  if (node.description !== undefined && typeof node.description !== 'string') return fail(jsonPath(path, 'description'), 'must be a string')
  if (node.title !== undefined && typeof node.title !== 'string') return fail(jsonPath(path, 'title'), 'must be a string')
  if (node.default !== undefined && !isJsonSafe(node.default)) return fail(jsonPath(path, 'default'), 'must be lossless JSON data')
  if (node.examples !== undefined && !isJsonSafe(node.examples)) return fail(jsonPath(path, 'examples'), 'must be lossless JSON data')
  if (node.enum !== undefined) {
    if (!Array.isArray(node.enum) || node.enum.length === 0 || !node.enum.every(value => isJsonSafe(value) && typeof value !== 'object')) {
      return fail(jsonPath(path, 'enum'), 'must be a non-empty array of scalar JSON values')
    }
  }
  if (node.const !== undefined && (typeof node.const === 'object' || !isJsonSafe(node.const))) {
    return fail(jsonPath(path, 'const'), 'must be a scalar JSON value')
  }
  if (node.oneOf !== undefined) {
    if (!Array.isArray(node.oneOf) || node.oneOf.length < 2) return fail(jsonPath(path, 'oneOf'), 'needs at least two branches')
    for (let index = 0; index < node.oneOf.length; index++) {
      const branch = checkSchemaNode(node.oneOf[index], jsonPath(path, 'oneOf[' + index + ']'))
      if (!branch.ok) return branch
    }
  }
  if (node.type === 'object') {
    if (node.additionalProperties !== undefined && typeof node.additionalProperties !== 'boolean') {
      return fail(jsonPath(path, 'additionalProperties'), 'must be a boolean')
    }
    if (node.properties !== undefined) {
      if (typeof node.properties !== 'object' || node.properties === null || Array.isArray(node.properties)) {
        return fail(jsonPath(path, 'properties'), 'must be an object of property schemas')
      }
      for (const [key, value] of Object.entries(node.properties as Record<string, unknown>)) {
        const branch = checkSchemaNode(value, jsonPath(path, 'properties.' + key))
        if (!branch.ok) return branch
      }
    }
    if (node.required !== undefined) {
      if (!Array.isArray(node.required) || node.required.some(name => typeof name !== 'string')) {
        return fail(jsonPath(path, 'required'), 'must be an array of property names')
      }
      const declared = node.properties === undefined ? [] : Object.keys(node.properties as Record<string, unknown>)
      for (const name of node.required as string[]) {
        if (!declared.includes(name)) return fail(jsonPath(path, 'required'), '"' + name + '" is not declared in properties')
      }
    }
  } else if (node.properties !== undefined || node.required !== undefined || node.additionalProperties !== undefined) {
    return fail(path, 'properties/required/additionalProperties need type: "object"')
  }
  if (node.items !== undefined) {
    if (node.type !== 'array') return fail(jsonPath(path, 'items'), 'needs type: "array"')
    const branch = checkSchemaNode(node.items, jsonPath(path, 'items'))
    if (!branch.ok) return branch
  }
  return { ok: true }
}

/**
 * Check a complete `parameters` schema: the root must be an object.
 * @param schema - the candidate schema value.
 * @returns ok, or the first violation with its path.
 */
export function checkParametersSchema(schema: unknown): SchemaCheckResult {
  const root = checkSchemaNode(schema)
  if (!root.ok) return root
  if ((schema as Record<string, unknown>).type !== 'object') {
    return fail('$', 'the parameters root must be type: "object"')
  }
  return { ok: true }
}

