/** Inputs for one tool execution. */
export interface RunToolCodeOptions {
    timeoutMs: number;
    memoryLimitMb: number;
    allowNetwork: boolean;
    /** 'workspace' additionally grants the confined `fs` capability. */
    scope: 'global' | 'workspace';
    /** Canonical workspace root; required for scope 'workspace'. */
    workspaceRoot?: string;
    /** Exposed as the tool body's `env` parameter. */
    env: Record<string, unknown>;
    /** Cooperative cancellation from the tool pipeline; aborts the worker. */
    signal?: AbortSignal;
}
/** A tool body threw, crashed, or returned a non-JSON value. */
export declare class ToolCodeError extends Error {
    /** The worker-side stack of the original error, when available. */
    readonly causeStack: string | undefined;
    /**
     * @param message - the failure message.
     * @param causeStack - worker-side stack, if the failure carried one.
     */
    constructor(message: string, causeStack?: string);
}
/** The call exceeded its wall-clock budget and the worker was terminated. */
export declare class ToolTimeoutError extends Error {
    /**
     * @param timeoutMs - the budget that was exceeded.
     */
    constructor(timeoutMs: number);
}
/**
 * Run one tool body in a fresh worker thread and settle with its JSON value.
 * @param code - the tool function body.
 * @param args - frozen call arguments.
 * @param options - execution budget and environment.
 * @returns the JSON return value, or rejects with a ToolCodeError/ToolTimeoutError.
 */
export declare function runToolCode(code: string, args: unknown, options: RunToolCodeOptions): Promise<unknown>;
