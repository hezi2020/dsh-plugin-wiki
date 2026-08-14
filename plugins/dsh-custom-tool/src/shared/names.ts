/** Tool-name pattern: snake_case so names stay stable across settings round-trips and sessions. */
export const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/

/** Names owned by this plugin's management tools; custom tools cannot shadow them. */
export const RESERVED_TOOL_NAMES: readonly string[] = ['custom_tool_create', 'custom_tool_remove', 'custom_tools_list']

/**
 * Whether a candidate tool name matches the snake_case pattern.
 * @param name - candidate name.
 * @returns whether the name is accepted by this plugin.
 */
export function isValidToolName(name: string): boolean {
  return TOOL_NAME_PATTERN.test(name)
}

/**
 * User-facing rejection reason for a candidate name, or null when accepted.
 * @param name - candidate name.
 * @returns the reason, or null.
 */
export function toolNameError(name: string): string | null {
  if (!isValidToolName(name)) return 'tool name "' + name + '" must match /^[a-z][a-z0-9_]{0,63}$/'
  if (RESERVED_TOOL_NAMES.includes(name)) return 'tool name "' + name + '" is reserved for dsh-custom-tool management tools'
  return null
}

