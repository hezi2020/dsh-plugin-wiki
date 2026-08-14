/**
 * Model-facing tools: let the chat agent create and manage scheduled tasks by
 * conversation ("每天上午 9 点跑一次测试并汇总结果" → the model calls
 * `task_create`). Registered per root agent scope, mirroring the
 * `dsh-schedule` tool pattern.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
import type { Context } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";
import type { TaskScheduler } from "./scheduler.js";
import type { RunView, TaskView } from "./schemas.js";
import { type TaskCreateInput, TaskNotFoundError, TasksInputError, type TasksStore } from "./store.js";
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

/** Stable error shape returned by every tool. */
interface ToolError {
	code: string;
	message: string;
}

function internalError(): ToolError {
	return { code: "internal_error", message: "The task operation failed." };
}

function inputError(error: TasksInputError): ToolError {
	return { code: error.code, message: error.message };
}

function renderValue(_args: unknown, value: unknown) {
	return [{ type: "text" as const, text: JSON.stringify(value) }];
}

function present(title: string, kind: "other" | "read", rawInput?: string) {
	return {
		card: "generic" as const,
		title,
		kind,
		...(rawInput === undefined ? {} : { rawInput }),
	};
}

/** Shared error variant for tool output schemas. */
const ERROR_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		code: { type: "string", required: true },
		message: { type: "string", required: true },
	},
} as const;

const TASK_VIEW_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: { type: "string", required: true },
		projectPath: { type: "string", required: true },
		name: { type: "string", required: true },
		prompt: { type: "string", required: true },
		kind: { type: "string", required: true },
		scheduledAt: { type: "string", required: true },
		everySeconds: { type: "number" },
		cron: { type: "string" },
		timeZone: { type: "string" },
		enabled: { type: "boolean", required: true },
		state: { type: "string", required: true },
		createdAt: { type: "string", required: true },
		updatedAt: { type: "string", required: true },
		lastRunAt: { type: "string" },
		lastRunId: { type: "string" },
	},
} as const;

const RUN_VIEW_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: { type: "string", required: true },
		taskId: { type: "string", required: true },
		projectPath: { type: "string", required: true },
		triggeredBy: { type: "string", required: true },
		overdue: { type: "boolean", required: true },
		startedAt: { type: "string", required: true },
		finishedAt: { type: "string" },
		status: { type: "string", required: true },
		output: { type: "string" },
		error: { type: "string" },
		sessionId: { type: "string" },
	},
} as const;

const AT_PARAMETER = {
	description:
		"Absolute target as strict offset RFC 3339 (e.g. 2026-08-20T09:00:00+08:00) or local date/time with an explicit IANA time_zone.",
	oneOf: [
		{ type: "string" },
		{
			type: "object",
			additionalProperties: false,
			properties: {
				date: { type: "string", required: true },
				time: { type: "string", required: true },
				time_zone: { type: "string", required: true },
			},
		},
	],
} as const;

/** Validate one model `task_create` argument set into store input. */
export function buildCreateInput(args: {
	prompt?: unknown;
	name?: unknown;
	project_path?: unknown;
	at?: unknown;
	every_seconds?: unknown;
	cron?: unknown;
	time_zone?: unknown;
	enabled?: unknown;
}): { input: TaskCreateInput } | { error: ToolError } {
	if (typeof args.prompt !== "string" || args.prompt.trim().length === 0) {
		return { error: { code: "invalid_prompt", message: "prompt must be a non-empty string." } };
	}
	const selectors =
		Number(args.at !== undefined) + Number(args.every_seconds !== undefined) + Number(args.cron !== undefined);
	if (selectors !== 1) {
		return {
			error: {
				code: "invalid_selector",
				message: "task_create accepts exactly one of at, every_seconds, or cron (with time_zone).",
			},
		};
	}
	if (
		args.every_seconds !== undefined &&
		(typeof args.every_seconds !== "number" || !Number.isSafeInteger(args.every_seconds))
	) {
		return { error: { code: "invalid_rule", message: "every_seconds must be a safe integer." } };
	}
	if (args.cron !== undefined && (typeof args.cron !== "string" || args.cron.trim().length === 0)) {
		return { error: { code: "invalid_cron", message: "cron must be a non-empty expression." } };
	}
	if (args.cron !== undefined && typeof args.time_zone !== "string") {
		return { error: { code: "invalid_time_zone", message: "cron requires time_zone." } };
	}
	if (typeof args.project_path !== "undefined" && typeof args.project_path !== "string") {
		return { error: { code: "invalid_project", message: "project_path must be a string." } };
	}
	const prompt = args.prompt.trim();
	return {
		input: {
			projectPath: typeof args.project_path === "string" ? args.project_path : "",
			name:
				typeof args.name === "string" && args.name.trim().length > 0
					? args.name.trim()
					: prompt.length > 40
						? `${prompt.slice(0, 40)}…`
						: prompt,
			prompt,
			kind: args.at !== undefined ? "at" : args.cron !== undefined ? "cron" : "every",
			...(args.at !== undefined ? { at: args.at as TaskCreateInput["at"] } : {}),
			...(args.every_seconds !== undefined ? { everySeconds: args.every_seconds as number } : {}),
			...(args.cron !== undefined ? { cron: (args.cron as string).trim() } : {}),
			...(args.time_zone !== undefined ? { timeZone: args.time_zone as string } : {}),
			...(args.enabled === undefined ? {} : { enabled: args.enabled === true }),
		},
	};
}

/** Current project directory of the calling agent, when known. */
function projectPathOf(exec: { agent?: { session: { header: { cwd?: string } } } }): string | undefined {
	return exec.agent?.session.header.cwd;
}

/**
 * Register the task tools into one exact root agent scope.
 * @param store - durable task store.
 * @param scheduler - run dispatcher.
 * @param agent - exact root agent receiving the tools.
 * @returns an aggregate disposer for every registration.
 */
export function registerTaskTools(store: TasksStore, scheduler: TaskScheduler, agent: unknown): () => void {
	const disposers: (() => void)[] = [];
	const execAgent = agent as { ctx: Context; session: { header: { cwd?: string } } };
	const agentCtx = execAgent.ctx;
	try {
		disposers.push(
			agentCtx.tools.register(
				defineTool({
					name: "task_create",
					description:
						"Create one scheduled task in a project directory. Supply a non-empty prompt and exactly one schedule: at (absolute time), every_seconds (>= 300), or cron with time_zone. The task runs its prompt as a fresh agent session in the project on schedule; each run consumes model tokens. Use the current session's working directory as the project by default.",
					parameters: {
						prompt: { type: "string", required: true, description: "Prompt executed when the task fires." },
						name: { type: "string", description: "Optional human-readable task name; defaults to a prompt snippet." },
						project_path: {
							type: "string",
							description: "Project directory to run in; defaults to the current working directory.",
						},
						at: AT_PARAMETER,
						every_seconds: { type: "number", description: "Fixed-rate interval in seconds, at least 300." },
						cron: { type: "string", description: "Cron expression (five/six/seven fields) evaluated in time_zone." },
						time_zone: { type: "string", description: "IANA time zone (required with cron; also used by a local at)." },
						enabled: { type: "boolean", description: "Whether the scheduler may fire the task; defaults to true." },
					},
					output: {
						schema: { oneOf: [TASK_VIEW_SCHEMA, ERROR_SCHEMA] },
						render: renderValue,
					},
					async execute(args, exec) {
						const built = buildCreateInput(args as Parameters<typeof buildCreateInput>[0]);
						if ("error" in built) return built.error;
						const projectPath = projectPathOf(exec);
						if (built.input.projectPath === "") {
							if (projectPath === undefined) {
								return { code: "invalid_project", message: "could not determine the project directory." };
							}
							built.input.projectPath = projectPath;
						}
						try {
							return toTaskView(await store.create(built.input));
						} catch (error) {
							if (error instanceof TasksInputError) return inputError(error);
							return internalError();
						}
					},
					presentCall: (args) =>
						present("Create scheduled task", "other", String((args as { prompt?: unknown }).prompt ?? "")),
				}),
			),
		);

		disposers.push(
			agentCtx.tools.register(
				defineTool({
					name: "task_list",
					description:
						"List scheduled tasks, optionally scoped to one project directory (defaults to the current working directory).",
					parameters: {
						project_path: { type: "string", description: "Project directory to filter by." },
					},
					output: {
						schema: { oneOf: [{ type: "array", items: TASK_VIEW_SCHEMA }, ERROR_SCHEMA] },
						render: renderValue,
					},
					execute(args, exec) {
						const projectPath =
							typeof (args as { project_path?: unknown }).project_path === "string"
								? ((args as { project_path: string }).project_path as string)
								: projectPathOf(exec);
						try {
							return Promise.resolve(store.list(projectPath).map(toTaskView));
						} catch {
							return Promise.resolve(internalError());
						}
					},
					presentCall: () => present("List scheduled tasks", "read"),
				}),
			),
		);

		disposers.push(
			agentCtx.tools.register(
				defineTool({
					name: "task_delete",
					description:
						"Delete one scheduled task and its run history by the exact id returned by task_create or task_list.",
					parameters: {
						id: { type: "string", required: true, description: "Exact task id." },
					},
					output: {
						schema: {
							oneOf: [
								{
									type: "object",
									additionalProperties: false,
									properties: {
										id: { type: "string", required: true },
										deleted: { type: "boolean", required: true },
									},
								},
								ERROR_SCHEMA,
							],
						},
						render: renderValue,
					},
					async execute(args) {
						const id = (args as { id: string }).id;
						try {
							const deleted = await store.remove(id);
							return { id, deleted };
						} catch (error) {
							if (error instanceof TaskNotFoundError) return { code: "task_not_found", message: error.message };
							return internalError();
						}
					},
					presentCall: (args) => present("Delete scheduled task", "other", String((args as { id?: unknown }).id ?? "")),
				}),
			),
		);

		disposers.push(
			agentCtx.tools.register(
				defineTool({
					name: "task_run",
					description:
						"Run one scheduled task immediately (the run-now gesture). The schedule is untouched; the run spawns a fresh agent session in the task's project and consumes model tokens. Returns the in-flight run record.",
					parameters: {
						id: { type: "string", required: true, description: "Exact task id." },
					},
					output: {
						schema: { oneOf: [RUN_VIEW_SCHEMA, ERROR_SCHEMA] },
						render: renderValue,
					},
					async execute(args) {
						const id = (args as { id: string }).id;
						try {
							return toRunView(await scheduler.runNow(id));
						} catch (error) {
							if (error instanceof TaskNotFoundError) return { code: "task_not_found", message: error.message };
							if (error instanceof Error && "code" in error && error.code === "task_busy") {
								return { code: "task_busy", message: error.message };
							}
							return internalError();
						}
					},
					presentCall: (args) =>
						present("Run scheduled task now", "other", String((args as { id?: unknown }).id ?? "")),
				}),
			),
		);

		disposers.push(
			agentCtx.tools.register(
				defineTool({
					name: "task_history",
					description: "List the run history of one scheduled task, newest first (status, times, output, errors).",
					parameters: {
						id: { type: "string", required: true, description: "Exact task id." },
					},
					output: {
						schema: { oneOf: [{ type: "array", items: RUN_VIEW_SCHEMA }, ERROR_SCHEMA] },
						render: renderValue,
					},
					execute(args) {
						const id = (args as { id: string }).id;
						try {
							return Promise.resolve(store.listRuns(id).map(toRunView));
						} catch {
							return Promise.resolve(internalError());
						}
					},
					presentCall: (args) => present("List task run history", "read", String((args as { id?: unknown }).id ?? "")),
				}),
			),
		);
	} catch (error) {
		for (const dispose of disposers.reverse()) dispose();
		throw error;
	}
	let active = true;
	return () => {
		if (!active) return;
		active = false;
		for (const dispose of disposers.reverse()) dispose();
	};
}
