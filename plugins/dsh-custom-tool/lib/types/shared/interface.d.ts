/**
 * Generate the TypeScript declaration Monaco injects as an extra lib, so the
 * editor offers completions and type checking for the tool body: `args`
 * typed from the declared parameters schema, plus `env` and the sandbox globals.
 */
/**
 * Build the `declare const args: {...}` extra-lib text for one tool.
 * @param schema - the parameters JSON Schema (object root), already subset-checked.
 * @returns the declaration source.
 */
export declare function argsExtraLib(schema: unknown): string;
/** The fixed sandbox globals declaration shared by every tool editor. */
export declare const ENV_EXTRA_LIB: string;
/**
 * Compose the complete extra-lib source for one tool.
 * @param schema - the parameters JSON Schema (object root).
 * @returns the full declaration source installed as one Monaco extra lib.
 */
export declare function customToolExtraLib(schema: unknown): string;
