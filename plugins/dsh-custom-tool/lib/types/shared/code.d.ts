/**
 * Tool-code checks shared by the host validator, the model tool, and the
 * browser form: byte size (UTF-8, the durable bound) and syntax.
 * @module dsh-custom-tool/shared/code
 */
export type CodeCheckResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
/**
 * UTF-8 byte length of one tool body — the size bound persisted settings and
 * the worker transport both live with.
 * @param code - tool source.
 * @returns the byte length.
 */
export declare function codeByteLength(code: string): number;
/**
 * Parse one tool body exactly as the executor wraps it: the body of an async
 * function taking `(args, env)`. Construction is side-effect-free, so this is
 * a pure syntax check callers may run on the UI thread.
 * @param code - tool source.
 * @returns success, or the parser's error message.
 */
export declare function checkCodeSyntax(code: string): CodeCheckResult;
