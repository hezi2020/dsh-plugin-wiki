/**
 * Client-side remote surface for the `tasks` typert namespace. Installed by
 * `ctx.remote.$mount(TYPERT_REMOTE)`; every method returns the wire result
 * shape `{ ok: true, value } | { ok: false, error }`.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
import type { CreateInput, RunView, TaskView, UpdateInput } from "../schemas.js";

/** One settled wire result. */
export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };

/** Typed projection of the installed `remote.tasks` namespace. */
export interface TasksRemote {
	list(projectPath?: string): Promise<RpcResult<TaskView[]>>;
	create(input: CreateInput): Promise<RpcResult<TaskView>>;
	update(id: string, patch: UpdateInput): Promise<RpcResult<TaskView>>;
	delete(id: string): Promise<RpcResult<{ id: string; deleted: boolean }>>;
	runNow(id: string): Promise<RpcResult<RunView>>;
	history(id: string): Promise<RpcResult<RunView[]>>;
}
