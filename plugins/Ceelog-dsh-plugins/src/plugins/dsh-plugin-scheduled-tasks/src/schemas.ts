/**
 * Wire schemas shared by the host TYPERT face and the client remote face.
 * These zod schemas anchor both directions of the `tasks` typert namespace:
 * the host validates incoming arguments and outgoing results, the client
 * validates outgoing arguments and incoming results.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
import { z } from "zod";

/** JSON-safe projection of one task record (undefined fields stripped). */
export const taskViewSchema = z.object({
	id: z.string(),
	projectPath: z.string(),
	name: z.string(),
	prompt: z.string(),
	kind: z.enum(["at", "every", "cron"]),
	scheduledAt: z.string(),
	everySeconds: z.number().optional(),
	cron: z.string().optional(),
	timeZone: z.string().optional(),
	enabled: z.boolean(),
	state: z.enum(["active", "finished"]),
	createdAt: z.string(),
	updatedAt: z.string(),
	lastRunAt: z.string().optional(),
	lastRunId: z.string().optional(),
});

/** JSON-safe projection of one run record. */
export const runViewSchema = z.object({
	id: z.string(),
	taskId: z.string(),
	projectPath: z.string(),
	triggeredBy: z.enum(["schedule", "manual"]),
	overdue: z.boolean(),
	startedAt: z.string(),
	finishedAt: z.string().optional(),
	status: z.enum(["running", "completed", "failed"]),
	output: z.string().optional(),
	error: z.string().optional(),
	sessionId: z.string().optional(),
});

/** Local calendar `at` selector (snake_case, mirroring dsh-schedule). */
export const localAtSchema = z.object({
	date: z.string(),
	time: z.string(),
	time_zone: z.string(),
});

/** The `at` selector: explicit-offset instant string or local calendar object. */
export const atSelectorSchema = z.union([z.string(), localAtSchema]);

/** Wire form of `tasks/create` input. */
export const createInputSchema = z.object({
	projectPath: z.string(),
	name: z.string(),
	prompt: z.string(),
	kind: z.enum(["at", "every", "cron"]),
	at: atSelectorSchema.optional(),
	everySeconds: z.number().optional(),
	cron: z.string().optional(),
	timeZone: z.string().optional(),
	enabled: z.boolean().optional(),
});

/** Wire form of `tasks/update` patch. */
export const updateInputSchema = z.object({
	name: z.string().optional(),
	prompt: z.string().optional(),
	kind: z.enum(["at", "every", "cron"]).optional(),
	at: atSelectorSchema.optional(),
	everySeconds: z.number().optional(),
	cron: z.string().optional(),
	timeZone: z.string().optional(),
	enabled: z.boolean().optional(),
});

/** Wire result of `tasks/delete`. */
export const deleteResultSchema = z.object({
	id: z.string(),
	deleted: z.boolean(),
});

export type TaskView = z.infer<typeof taskViewSchema>;
export type RunView = z.infer<typeof runViewSchema>;
export type CreateInput = z.infer<typeof createInputSchema>;
export type UpdateInput = z.infer<typeof updateInputSchema>;
