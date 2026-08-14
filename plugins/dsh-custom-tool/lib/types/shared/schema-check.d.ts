/**
 * The enforced JSON Schema subset for custom-tool `parameters`, mirroring the
 * rules of `@deepseek-ai/dsh-tools`'s `assertSupportedJsonSchema`. The host
 * re-checks at registration; this checker runs earlier — at settings-write and
 * client-save time — so the user learns about violations before anything persists.
 */
/** Whether a value is lossless-JSON-safe (finite numbers, no cycles, no functions). */
export declare function isJsonSafe(value: unknown): boolean;
export type SchemaCheckResult = {
    ok: true;
} | {
    ok: false;
    path: string;
    message: string;
};
/**
 * Check one schema node against the subset.
 * @param schema - the node value.
 * @param path - JSON path of the node in the root schema, for error reporting.
 * @returns ok, or the first violation with its path.
 */
export declare function checkSchemaNode(schema: unknown, path?: string): SchemaCheckResult;
/**
 * Check a complete `parameters` schema: the root must be an object.
 * @param schema - the candidate schema value.
 * @returns ok, or the first violation with its path.
 */
export declare function checkParametersSchema(schema: unknown): SchemaCheckResult;
