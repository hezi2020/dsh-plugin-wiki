/**
 * Scheduled-tasks plugin entry: opens the `scheduled-tasks` storage domain,
 * mounts the task store, executor, scheduler, and the `tasks` typert service
 * (`ctx.tasks`), then starts the scheduler.
 *
 * The host TYPERT face lives in `./typert` (auto-registered by
 * `dsh-typert-loader`); the browser half lives in `./client`.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */

import type { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { TaskExecutor } from "./executor.js";
import { TasksRuntime } from "./runtime.js";
import { TaskScheduler } from "./scheduler.js";
import { TasksStore } from "./store.js";
import { registerTaskTools } from "./tools.js";
import { tasksDomain } from "./types.js";

/** Stable cordis plugin name. */
export const name = "scheduled-tasks";

/** Services required before the domain can open. */
export const inject = ["storageDomain", "agents"];

/** Validated plugin configuration shape. */
export interface ScheduledTasksConfig {
	/** Maximum concurrently running agent sessions across all tasks. */
	maxConcurrentRuns: number;
	/** Run-history records retained per task (oldest pruned beyond this cap). */
	keepRunsPerTask: number;
	/** Hard bound on one agent turn before the run is marked failed (ms). */
	runTimeoutMs: number;
}

/** Plugin configuration. */
export const Config = z.object({
	/** Maximum concurrently running agent sessions across all tasks. */
	maxConcurrentRuns: z.number().min(1).max(16).default(2),
	/** Run-history records retained per task (oldest pruned beyond this cap). */
	keepRunsPerTask: z.number().min(1).max(100).default(20),
	/** Hard bound on one agent turn before the run is marked failed. */
	runTimeoutMs: z.number().min(60_000).max(3_600_000).default(1_800_000),
});

/** Mount the plugin. */
export async function apply(ctx: Context, config: ScheduledTasksConfig) {
	const domain = await ctx.storageDomain.open(tasksDomain);
	const store = new TasksStore(ctx, domain, { keepRunsPerTask: config.keepRunsPerTask });
	const executor = new TaskExecutor(ctx, store, {
		maxConcurrentRuns: config.maxConcurrentRuns,
		runTimeoutMs: config.runTimeoutMs,
	});
	const scheduler = new TaskScheduler(ctx, store, executor);
	// The TypertRemoteService constructor registers `ctx.tasks` itself and
	// unregisters it when this plugin's fiber unloads.
	void new TasksRuntime(ctx, store, scheduler);
	// Model-facing tools: every root agent created after this plugin loads can
	// create/manage tasks by conversation. Tools are registered into the agent's
	// own scope and removed with it.
	const stopToolInstall = ctx.on("agent/created", ({ agent }) => {
		if (ctx.agents.roots().includes(agent)) {
			agent.ctx.effect(() => {
				const disposeTools = registerTaskTools(store, scheduler, agent);
				return () => {
					disposeTools();
				};
			}, "scheduled-tasks.tools()");
		}
	});
	ctx.effect(
		() => () => {
			stopToolInstall();
			void scheduler.dispose();
			void domain.close();
		},
		"scheduled-tasks.teardown()",
	);
	scheduler.start();
}
