export interface WorkerOk {
    ok: true;
    value: unknown;
}
export interface WorkerFailure {
    ok: false;
    error: {
        name: string;
        message: string;
        stack: string | undefined;
    };
}
