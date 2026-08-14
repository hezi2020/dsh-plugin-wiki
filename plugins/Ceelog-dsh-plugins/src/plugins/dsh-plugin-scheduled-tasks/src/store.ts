/**
 * Durable task store over the `scheduled-tasks` domain.
 *
 * Reads are synchronous from the domain's in-memory state; every mutation
 * awaits backend durability first. Run history is capped per task
 * (`keepRunsPerTask`) by deleting the oldest records beyond the cap.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */

import { randomUUID } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
import type { Domain, KvTable } from "@deepseek-ai/dsh-storage-domain";
import {
	canonicalizeTimeZone,
	resolveAtTarget,
	resolveCronOccurrences,
	validateCron,
	validateEverySeconds,
} from "./time.js";
import { RunId, type RunRecord, type RunStatus, type Task, TaskId, type TasksDomain } from "./types.js";

/** Validation failure with a stable code, surfaced to the UI. */
export class TasksInputError extends Error {
	readonly code: string;

	constructor(code: string, message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "TasksInputError";
		this.code = code;
	}
}

/** Error used when a task cannot be found. */
export class TaskNotFoundError extends Error {
	constructor(id: string) {
		super(`task ${id} does not exist`);
		this.name = "TaskNotFoundError";
	}
}

/** Store configuration derived from plugin config. */
export interface TasksStoreConfig {
	/** Maximum run-history records kept per task. */
	keepRunsPerTask: number;
}

/** Input accepted by {@link TasksStore.create}. */
export interface TaskCreateInput {
	projectPath: string;
	name: string;
	prompt: string;
	kind: "at" | "every" | "cron";
	at?: AtSelectorInput;
	everySeconds?: number;
	/** Cron expression (five/six/seven fields); required when `kind` is `cron`. */
	cron?: string;
	/** IANA time zone the cron expression is evaluated in; required when `kind` is `cron`. */
	timeZone?: string;
	enabled?: boolean;
}

/** Wire form of the `at` selector (snake_case like dsh-schedule). */
export type AtSelectorInput = string | { date: string; time: string; time_zone: string };

/** Partial update accepted by {@link TasksStore.update}. */
export interface TaskUpdateInput {
	name?: string;
	prompt?: string;
	kind?: "at" | "every" | "cron";
	at?: AtSelectorInput;
	everySeconds?: number;
	cron?: string;
	timeZone?: string;
	enabled?: boolean;
}

function nowInstant(): string {
	return new Date().toISOString();
}

async function normalizeProjectPath(ctx: Context, projectPath: string): Promise<string> {
	const trimmed = projectPath.trim();
	if (trimmed.length === 0)
		throw new TasksInputError("invalid_project", "projectPath must be a non-empty directory path.");
	const workspace = ctx.get("workspaceRegistry");
	if (workspace !== undefined && typeof workspace.resolveByPath === "function") {
		try {
			const resolved = await workspace.resolveByPath(trimmed);
			if (resolved !== undefined && resolved.path !== undefined) return resolved.path;
		} catch {
			// Not a registered workspace: fall through to plain path handling.
		}
	}
	const { realpath } = await import("node:fs/promises");
	try {
		return await realpath(trimmed);
	} catch {
		return trimmed;
	}
}

/** Sanitize a display name / prompt at the store boundary. */
function normalizeText(value: string, field: "name" | "prompt", maxLength: number): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) throw new TasksInputError("invalid_text", `${field} must be non-empty after trimming.`);
	if (trimmed.length > maxLength)
		throw new TasksInputError("invalid_text", `${field} must be at most ${maxLength} characters.`);
	return trimmed;
}

/** Compute the durable target for a task input. */
export function resolveTaskTarget(
	input: TaskCreateInput,
	now: number,
): { kind: "at" | "every" | "cron"; scheduledAt: string; everySeconds?: number; cron?: string; timeZone?: string } {
	if (input.kind === "at") {
		if (input.at === undefined) throw new TasksInputError("invalid_selector", "at tasks require the at selector.");
		return { kind: "at", scheduledAt: resolveAtTarget(input.at, now) };
	}
	if (input.kind === "cron") {
		if (input.cron === undefined || input.timeZone === undefined)
			throw new TasksInputError("invalid_selector", "cron tasks require cron and time_zone.");
		const expression = validateCron(input.cron, input.timeZone);
		const timeZone = canonicalizeTimeZone(input.timeZone);
		const { occurrenceAt } = resolveCronOccurrences(expression, timeZone, now);
		if (occurrenceAt === undefined)
			throw new TasksInputError("invalid_cron", "cron expression never fires again in the selected time zone.");
		return { kind: "cron", scheduledAt: occurrenceAt, cron: expression, timeZone };
	}
	if (input.everySeconds === undefined)
		throw new TasksInputError("invalid_selector", "every tasks require every_seconds.");
	validateEverySeconds(input.everySeconds);
	const target = now + input.everySeconds * 1000;
	return { kind: "every", scheduledAt: new Date(target).toISOString(), everySeconds: input.everySeconds };
}

/** The `scheduled-tasks` store: typed table access plus domain validation. */
export class TasksStore {
	private readonly tasks: KvTable<TaskId, Task>;
	private readonly runs: KvTable<RunId, RunRecord>;
	private readonly config: TasksStoreConfig;

	constructor(
		private readonly ctx: Context,
		domain: Domain<TasksDomain>,
		config: TasksStoreConfig,
	) {
		this.tasks = domain.table("tasks");
		this.runs = domain.table("runs");
		this.config = config;
	}

	// ── tasks ────────────────────────────────────────────────────────────────

	/** All tasks, in creation order. */
	list(projectPath?: string): Task[] {
		const all = [...this.tasks.entries()].map(([, task]) => task);
		all.sort((left, right) => (left.createdAt < right.createdAt ? -1 : left.createdAt > right.createdAt ? 1 : 0));
		return projectPath === undefined ? all : all.filter((task) => task.projectPath === projectPath);
	}

	/** Read one task synchronously. */
	get(id: string): Task | undefined {
		return this.tasks.get(TaskId(id));
	}

	/** Create and persist one task. */
	async create(input: TaskCreateInput): Promise<Task> {
		const now = Date.now();
		const projectPath = await normalizeProjectPath(this.ctx, input.projectPath);
		const target = resolveTaskTarget(input, now);
		const createdAt = nowInstant();
		const task: Task = {
			id: TaskId(`task-${randomUUID()}`),
			projectPath,
			name: normalizeText(input.name, "name", 200),
			prompt: normalizeText(input.prompt, "prompt", 20_000),
			kind: target.kind,
			scheduledAt: target.scheduledAt,
			...(target.everySeconds === undefined ? {} : { everySeconds: target.everySeconds }),
			...(target.cron === undefined ? {} : { cron: target.cron }),
			...(target.timeZone === undefined ? {} : { timeZone: target.timeZone }),
			enabled: input.enabled ?? true,
			state: "active",
			createdAt,
			updatedAt: createdAt,
		};
		await this.tasks.put(TaskId(task.id), task);
		return task;
	}

	/** Apply a partial update to one task. */
	async update(id: string, patch: TaskUpdateInput): Promise<Task> {
		const existing = this.tasks.get(TaskId(id));
		if (existing === undefined) throw new TaskNotFoundError(id);
		const next: Task = { ...existing };
		if (patch.name !== undefined) next.name = normalizeText(patch.name, "name", 200);
		if (patch.prompt !== undefined) next.prompt = normalizeText(patch.prompt, "prompt", 20_000);
		if (patch.enabled !== undefined) next.enabled = patch.enabled;
		if (patch.kind !== undefined) {
			const target = resolveTaskTarget({ ...existing, ...patch, kind: patch.kind }, Date.now());
			next.kind = target.kind;
			next.scheduledAt = target.scheduledAt;
			if (target.everySeconds === undefined) delete next.everySeconds;
			else next.everySeconds = target.everySeconds;
			if (target.cron === undefined) delete next.cron;
			else next.cron = target.cron;
			if (target.timeZone === undefined) delete next.timeZone;
			else next.timeZone = target.timeZone;
		}
		next.updatedAt = nowInstant();
		await this.tasks.put(TaskId(next.id), next);
		return next;
	}

	/** Delete one task and every run record it owns. */
	async remove(id: string): Promise<boolean> {
		const task = this.tasks.get(TaskId(id));
		if (task === undefined) return false;
		await this.tasks.delete(TaskId(id));
		for (const [runId, run] of [...this.runs.entries()]) {
			if (run.taskId === id) await this.runs.delete(runId);
		}
		return true;
	}

	/** Persist the schedule advance / finish transition of one task. */
	async persistTaskTransition(
		id: string,
		patch: Partial<Pick<Task, "scheduledAt" | "state" | "enabled" | "lastRunAt" | "lastRunId">>,
	): Promise<Task | undefined> {
		const task = this.tasks.get(TaskId(id));
		if (task === undefined) return undefined;
		const next: Task = { ...task, ...patch, updatedAt: nowInstant() };
		await this.tasks.put(TaskId(next.id), next);
		return next;
	}

	// ── runs ─────────────────────────────────────────────────────────────────

	/** Open a run record (status `running`). */
	async beginRun(
		record: Omit<RunRecord, "id" | "startedAt" | "status"> & { id?: string; startedAt?: string },
	): Promise<RunRecord> {
		const run: RunRecord = {
			id: RunId(`run-${randomUUID()}`),
			startedAt: nowInstant(),
			status: "running",
			...record,
		};
		await this.runs.put(RunId(run.id), run);
		return run;
	}

	/** Settle a run record and update the owning task's last-run pointers. */
	async finishRun(
		run: RunRecord,
		taskId: string,
		outcome: { status: RunStatus; output?: string; error?: string; sessionId?: string },
	): Promise<RunRecord> {
		const settled: RunRecord = {
			...run,
			status: outcome.status,
			finishedAt: nowInstant(),
			...(outcome.output === undefined ? {} : { output: outcome.output }),
			...(outcome.error === undefined ? {} : { error: outcome.error }),
			...(outcome.sessionId === undefined ? {} : { sessionId: outcome.sessionId }),
		};
		await this.runs.put(RunId(settled.id), settled);
		await this.persistTaskTransition(taskId, {
			lastRunAt: settled.startedAt,
			lastRunId: settled.id,
		});
		await this.pruneRuns(taskId);
		return settled;
	}

	/** Keep at most `keepRunsPerTask` records per task, oldest first. */
	private async pruneRuns(taskId: string): Promise<void> {
		const owned = [...this.runs.entries()]
			.filter(([, run]) => run.taskId === taskId)
			.sort((left, right) => (left[1].startedAt < right[1].startedAt ? -1 : 1));
		const excess = owned.length - this.config.keepRunsPerTask;
		for (let index = 0; index < excess; index += 1) {
			const oldest = owned[index];
			if (oldest !== undefined) await this.runs.delete(oldest[0]);
		}
	}

	/** Run history for one task, newest first. */
	listRuns(taskId: string): RunRecord[] {
		return [...this.runs.entries()]
			.filter(([, run]) => run.taskId === taskId)
			.map(([, run]) => run)
			.sort((left, right) => (left.startedAt > right.startedAt ? -1 : left.startedAt < right.startedAt ? 1 : 0));
	}
}
