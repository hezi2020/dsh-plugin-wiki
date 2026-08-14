/**
 * Generate the TypeScript declaration Monaco injects as an extra lib, so the
 * editor offers completions and type checking for the tool body: `args`
 * typed from the declared parameters schema, plus `env` and the sandbox globals.
 */

const INDENT = '  '

function typeOfNode(node: Record<string, unknown>, depth: number): string {
  if (node.oneOf !== undefined) {
    const branches = (node.oneOf as Record<string, unknown>[]).map(branch => typeOfNode(branch, depth))
    return branches.join(' | ')
  }
  switch (node.type) {
    case 'string':
      if (Array.isArray(node.enum) && node.enum.length > 0) return (node.enum as string[]).map(value => JSON.stringify(value)).join(' | ')
      return 'string'
    case 'number':
    case 'integer': return 'number'
    case 'boolean': return 'boolean'
    case 'null': return 'null'
    case 'array': return node.items === undefined ? 'unknown[]' : '(' + typeOfNode(node.items as Record<string, unknown>, depth) + ')[]'
    case 'object': return objectLiteral(node, depth)
    default: return 'unknown'
  }
}

function objectLiteral(node: Record<string, unknown>, depth: number): string {
  const properties = (node.properties ?? {}) as Record<string, Record<string, unknown>>
  const required = new Set<string>(node.required as string[] | undefined)
  const pad = INDENT.repeat(depth)
  const inner = INDENT.repeat(depth + 1)
  const lines = Object.entries(properties).map(([key, prop]) => {
    const optional = required.has(key) ? '' : '?'
    const type = typeOfNode(prop, depth + 1)
    return inner + key + optional + ': ' + type
  })
  return lines.length === 0 ? 'Record<string, unknown>' : '{\n' + lines.join('\n') + '\n' + pad + '}'
}

/**
 * Build the `declare const args: {...}` extra-lib text for one tool.
 * @param schema - the parameters JSON Schema (object root), already subset-checked.
 * @returns the declaration source.
 */
export function argsExtraLib(schema: unknown): string {
  const node = schema as Record<string, unknown>
  return 'declare const args: ' + objectLiteral(node, 0) + '\n'
}

/** The fixed sandbox globals declaration shared by every tool editor. */
export const ENV_EXTRA_LIB = [
  'declare const env: { readonly tool: string }',
  'declare const args: Record<string, unknown>',
  '',
].join('\n')

/**
 * Compose the complete extra-lib source for one tool.
 * @param schema - the parameters JSON Schema (object root).
 * @returns the full declaration source installed as one Monaco extra lib.
 */
export function customToolExtraLib(schema: unknown): string {
  return argsExtraLib(schema) + ENV_EXTRA_LIB
}

