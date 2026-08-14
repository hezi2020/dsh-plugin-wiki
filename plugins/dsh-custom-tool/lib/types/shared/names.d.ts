/** Tool-name pattern: snake_case so names stay stable across settings round-trips and sessions. */
export declare const TOOL_NAME_PATTERN: RegExp;
/** Names owned by this plugin's management tools; custom tools cannot shadow them. */
export declare const RESERVED_TOOL_NAMES: readonly string[];
/**
 * Whether a candidate tool name matches the snake_case pattern.
 * @param name - candidate name.
 * @returns whether the name is accepted by this plugin.
 */
export declare function isValidToolName(name: string): boolean;
/**
 * User-facing rejection reason for a candidate name, or null when accepted.
 * @param name - candidate name.
 * @returns the reason, or null.
 */
export declare function toolNameError(name: string): string | null;
