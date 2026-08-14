import { describe, expect, it } from "vitest";
import type { TaskExecutor } from "../src/executor.js";
import { TaskScheduler } from "../src/scheduler.js";
import type { TasksStore } from "../src/store.js";
import type { RunRecord, Task } from "../src/types.js";

// ── fakes ──────────────────────────────────────────────────────────────────

const NOW = Date.parse("2026-08-14T09:00:00.000Z");

function makeTask(overrides: Partial<Task> & { id: string }): Task {
	return {
		projectPath: "/projects/demo",
		name: "demo task",
		prompt: "do the thing",
		kind: "at",
		scheduledAt: "2026-08-14T08:00:00.000Z",
		enabled: true,
		state: "active",
		createdAt: "2026-08-13T09:00:00.000Z",
		updatedAt: "2026-08-13T09:00:00.000Z",
		...overrides,
	};
}

class FakeStore {
	tasks = new Map<string, Task>();
	transitions: { id: string; patch: Record<string, unknown> }[] = [];

	list(): Task[] {
		return [...this.tasks.values()];
	}

	get(id: string): Task | undefined {
		return this.tasks.get(id);
	}

	async persistTaskTransition(
		id: string,
		patch: Partial<Pick<Task, "scheduledAt" | "state" | "enabled" | "lastRunAt" | "lastRunId">>,
	): Promise<Task | undefined> {
		const task = this.tasks.get(id);
		if (task === undefined) return undefined;
		const next = { ...task, ...patch };
		this.tasks.set(id, next);
		this.transitions.push({ id, patch: { ...patch } });
		return next;
	}

	async beginRun(record: Omit<RunRecord, "id" | "startedAt" | "status">): Promise<RunRecord> {
		return {
			...record,
			id: "run-1",
			startedAt: "2026-08-14T09:00:00.000Z",
			status: "running",
		};
	}
}

class FakeExecutor {
	runs: { task: Task; options: { triggeredBy: string; overdue: boolean }; prestarted?: RunRecord }[] = [];

	async run(
		task: Task,
		options: { triggeredBy: "schedule" | "manual"; overdue: boolean },
		prestarted?: RunRecord,
	): Promise<RunRecord> {
		this.runs.push({ task, options, prestarted });
		const run: RunRecord = {
			...prestarted,
			id: `run-${this.runs.length}`,
			taskId: task.id,
			projectPath: task.projectPath,
			triggeredBy: options.triggeredBy,
			overdue: options.overdue,
			startedAt: "2026-08-14T09:00:01.000Z",
			finishedAt: "2026-08-14T09:00:05.000Z",
			status: "completed",
			output: "done",
		};
		return run;
	}
}

function makeCtx() {
	return { logger: { warn: () => {} } } as unknown as import("@deepseek-ai/cordis").Context;
}

// ── tests ──────────────────────────────────────────────────────────────────

describe("TaskScheduler", () => {
	it("dispatches a due one-shot once and finishes it", async () => {
		const store = new FakeStore();
		const task = makeTask({ id: "task-1" });
		store.tasks.set(task.id, task);
		const executor = new FakeExecutor();
		const scheduler = new TaskScheduler(
			makeCtx(),
			store as unknown as TasksStore,
			executor as unknown as TaskExecutor,
			{
				now: () => NOW,
			},
		);
		scheduler.start();
		await scheduler.flush();
		await scheduler.dispose();

		expect(executor.runs).toHaveLength(1);
		expect(executor.runs[0]!.options.triggeredBy).toBe("schedule");
		const after = store.tasks.get("task-1")!;
		expect(after.state).toBe("finished");
		expect(after.enabled).toBe(false);
	});

	it("marks an overdue catch-up run and advances an every task to the next anchor", async () => {
		const store = new FakeStore();
		const task = makeTask({ id: "task-1", kind: "every", everySeconds: 600, scheduledAt: "2026-08-14T08:30:00.000Z" });
		store.tasks.set(task.id, task);
		const executor = new FakeExecutor();
		const scheduler = new TaskScheduler(
			makeCtx(),
			store as unknown as TasksStore,
			executor as unknown as TaskExecutor,
			{
				now: () => NOW,
			},
		);
		scheduler.start();
		await scheduler.flush();
		await scheduler.dispose();

		expect(executor.runs).toHaveLength(1);
		// Anchor 08:30 + 3×600s = 09:00 (the latest due occurrence); next is 09:10.
		expect(executor.runs[0]!.options.overdue).toBe(true);
		expect(store.tasks.get("task-1")!.scheduledAt).toBe("2026-08-14T09:10:00.000Z");
		expect(store.tasks.get("task-1")!.state).toBe("active");
	});

	it("does not dispatch a task whose target is still in the future", async () => {
		const store = new FakeStore();
		const task = makeTask({ id: "task-1", scheduledAt: "2026-08-14T10:00:00.000Z" });
		store.tasks.set(task.id, task);
		const executor = new FakeExecutor();
		const scheduler = new TaskScheduler(
			makeCtx(),
			store as unknown as TasksStore,
			executor as unknown as TaskExecutor,
			{
				now: () => NOW,
			},
		);
		scheduler.start();
		await scheduler.flush();
		await scheduler.dispose();

		expect(executor.runs).toHaveLength(0);
		expect(store.tasks.get("task-1")!.state).toBe("active");
	});

	it("skips disabled and finished tasks", async () => {
		const store = new FakeStore();
		store.tasks.set("task-1", makeTask({ id: "task-1", enabled: false }));
		store.tasks.set("task-2", makeTask({ id: "task-2", state: "finished", enabled: true }));
		const executor = new FakeExecutor();
		const scheduler = new TaskScheduler(
			makeCtx(),
			store as unknown as TasksStore,
			executor as unknown as TaskExecutor,
			{
				now: () => NOW,
			},
		);
		scheduler.start();
		await scheduler.flush();
		await scheduler.dispose();

		expect(executor.runs).toHaveLength(0);
	});

	it("runNow starts a manual run without touching the schedule", async () => {
		const store = new FakeStore();
		const task = makeTask({ id: "task-1", scheduledAt: "2026-08-14T10:00:00.000Z" });
		store.tasks.set(task.id, task);
		const executor = new FakeExecutor();
		const scheduler = new TaskScheduler(
			makeCtx(),
			store as unknown as TasksStore,
			executor as unknown as TaskExecutor,
			{
				now: () => NOW,
			},
		);
		const run = await scheduler.runNow("task-1");
		await scheduler.flush();
		await scheduler.dispose();

		expect(run.triggeredBy).toBe("manual");
		expect(executor.runs).toHaveLength(1);
		expect(executor.runs[0]!.options.triggeredBy).toBe("manual");
		expect(store.tasks.get("task-1")!.state).toBe("active");
		expect(store.tasks.get("task-1")!.scheduledAt).toBe("2026-08-14T10:00:00.000Z");
	});

	it("rejects runNow for an unknown task", async () => {
		const store = new FakeStore();
		const scheduler = new TaskScheduler(
			makeCtx(),
			store as unknown as TasksStore,
			new FakeExecutor() as unknown as TaskExecutor,
			{
				now: () => NOW,
			},
		);
		await expect(scheduler.runNow("task-nope")).rejects.toThrow(/does not exist/);
		await scheduler.dispose();
	});
});
