/**
 * The `tasks` typert host service. Registered as `ctx.tasks` by the plugin
 * body; the gateway dispatches `tasks/*` endpoints here. Methods return
 * JSON-safe views (all undefined fields stripped) so the strict wire codecs
 * accept them at the boundary.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */

import type { Context } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import type { TaskScheduler } from "./scheduler.js";
import type { CreateInput, RunView, TaskView, UpdateInput } from "./schemas.js";
import { TaskNotFoundError, TasksInputError, type TasksStore } from "./store.js";
import type { RunRecord, Task } from "./types.js";

/** Strip every undefined value recursively so the result is JSON-safe. */
function jsonSafe<T>(value: T): T {
	if (Array.isArray(value)) return value.map((entry) => jsonSafe(entry)) as T;
	if (typeof value === "object" && value !== null) {
		const out: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
			if (entry !== undefined) out[key] = jsonSafe(entry);
		}
		return out as T;
	}
	return value;
}

function toTaskView(task: Task): TaskView {
	return jsonSafe(task);
}

function toRunView(run: RunRecord): RunView {
	return jsonSafe(run);
}

/** Stable user-facing input failure. */
export { TaskNotFoundError, TasksInputError };

/** Host service backing the `tasks` typert namespace. */
export class TasksRuntime extends TypertRemoteService {
	constructor(
		ctx: Context,
		private readonly store: TasksStore,
		private readonly scheduler: TaskScheduler,
	) {
		super(ctx, "tasks");
	}

	/** List tasks, optionally scoped to one project directory. */
	@Remote
	list(projectPath?: string): TaskView[] {
		return this.store.list(projectPath).map(toTaskView);
	}

	/** Create one task. */
	@Remote
	async create(input: CreateInput): Promise<TaskView> {
		return toTaskView(await this.store.create(input));
	}

	/** Apply a partial update to one task. */
	@Remote
	async update(id: string, patch: UpdateInput): Promise<TaskView> {
		return toTaskView(await this.store.update(id, patch));
	}

	/** Delete one task and its run history. */
	@Remote
	async delete(id: string): Promise<{ id: string; deleted: boolean }> {
		const deleted = await this.store.remove(id);
		return { id, deleted };
	}

	/** Start one task immediately; the schedule is untouched. */
	@Remote
	async runNow(id: string): Promise<RunView> {
		return toRunView(await this.scheduler.runNow(id));
	}

	/** Run history for one task, newest first. */
	@Remote
	history(id: string): RunView[] {
		return this.store.listRuns(id).map(toRunView);
	}
}
