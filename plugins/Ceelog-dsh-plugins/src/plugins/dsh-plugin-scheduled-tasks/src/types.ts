/**
 * Durable domain model for scheduled tasks and their run history.
 *
 * The domain lives in the DSH storage hub (`ctx.storageDomain`) under the
 * `scheduled-tasks` domain: one `tasks` table keyed by task id and one `runs`
 * table keyed by run id. All timestamps are canonical four-digit-year RFC 3339
 * UTC instants.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { z } from "zod";

/** Branded task identifier. */
export type TaskId = string & { readonly __taskId: unique symbol };
/** Branded run identifier. */
export type RunId = string & { readonly __runId: unique symbol };

/** Mint a branded task id from a raw value (boundary-only cast). */
export function TaskId(value: string): TaskId {
	return value as TaskId;
}

/** Mint a branded run id from a raw value (boundary-only cast). */
export function RunId(value: string): RunId {
	return value as RunId;
}

const taskIdSchema = z.string().regex(/^task-[A-Za-z0-9-]+$/);
const runIdSchema = z.string().regex(/^run-[A-Za-z0-9-]+$/);

/** Canonical four-digit-year RFC 3339 UTC instant (e.g. `2026-08-14T09:30:00.000Z`). */
export const instantSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

/** One durable scheduled-task record. */
export const taskSchema = z.object({
	id: taskIdSchema,
	/** Canonical absolute project directory the task runs in. */
	projectPath: z.string().min(1),
	/** Human-readable task name. */
	name: z.string().min(1).max(200),
	/** Prompt executed by a fresh agent session in the project directory. */
	prompt: z.string().min(1).max(20000),
	/** `at`: one-shot absolute target; `every`: fixed creation-anchored interval; `cron`: calendar rule. */
	kind: z.enum(["at", "every", "cron"]),
	/** UTC target; for `every`/`cron` the next anchor-aligned occurrence. */
	scheduledAt: instantSchema,
	/** Fixed interval in seconds; present only when `kind` is `every`. */
	everySeconds: z.number().int().min(300).optional(),
	/** Five/six/seven-field cron expression; present only when `kind` is `cron`. */
	cron: z.string().min(1).max(200).optional(),
	/** IANA time zone the cron expression is evaluated in; present only when `kind` is `cron`. */
	timeZone: z.string().min(1).max(100).optional(),
	/** Whether the scheduler may dispatch this task. */
	enabled: z.boolean(),
	/** `active` tasks are schedulable; `finished` one-shots no longer run. */
	state: z.enum(["active", "finished"]),
	createdAt: instantSchema,
	updatedAt: instantSchema,
	lastRunAt: instantSchema.optional(),
	lastRunId: runIdSchema.optional(),
});
export type Task = z.infer<typeof taskSchema>;

/** Run outcome status. */
export const runStatusSchema = z.enum(["running", "completed", "failed"]);
export type RunStatus = z.infer<typeof runStatusSchema>;

/** One durable run-history record for a task. */
export const runSchema = z.object({
	id: runIdSchema,
	taskId: taskIdSchema,
	projectPath: z.string().min(1),
	/** `schedule` fires from the scheduler; `manual` from the run-now gesture. */
	triggeredBy: z.enum(["schedule", "manual"]),
	/** True when the scheduler picked the task up late (startup catch-up or a jammed timer). */
	overdue: z.boolean(),
	startedAt: instantSchema,
	finishedAt: instantSchema.optional(),
	status: runStatusSchema,
	/** Final assistant text, truncated at the store boundary. */
	output: z.string().max(20000).optional(),
	/** Stable failure description (never a raw backend exception). */
	error: z.string().max(4000).optional(),
	/** Session id of the spawned agent run (hidden from the session list via archiving). */
	sessionId: z.string().optional(),
});
export type RunRecord = z.infer<typeof runSchema>;

/** The `scheduled_tasks` domain declaration. */
export const tasksDomain = defineDomain({
	name: "scheduled_tasks",
	version: 1,
	tables: {
		tasks: domainTable<TaskId, Task>(taskSchema),
		runs: domainTable<RunId, RunRecord>(runSchema),
	},
});

/** Type of the opened `scheduled-tasks` domain. */
export type TasksDomain = typeof tasksDomain;
