/**
 * Scheduled-tasks panel UI. Mounted into the sidebar footer action seat; opens
 * a modal that manages per-project scheduled tasks (list, create, edit,
 * delete, run-now, history) through the `tasks` typert remote.
 *
 * Styling uses the DSH design tokens (`--dsw-alias-*`) exactly as the shipped
 * Cordis panel does, so the panel follows the active light/dark theme. The
 * stylesheet is injected once by the client plugin body (the same mechanism
 * the official client bundles use for CSS modules).
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */

import type { WorkspaceListState } from "@deepseek-ai/dsh-client-runtime/client";
import { IconChecklistOutline14 } from "@deepseek-ai/dsh-client-ui-primitives";
import type { SnapshotSelectorHook } from "@deepseek-ai/dsh-client-ui-slots";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CreateInput, RunView, TaskView, UpdateInput } from "../schemas.js";
import type { RpcResult, TasksRemote } from "./remote.js";
import { C } from "./styles.js";

/** Owner + injected + framework standard props for the footer action entry. */
export interface TasksFooterActionProps {
	/** Sidebar column state: wide row vs collapsed rail icon. */
	wide: boolean;
	/** Injected `remote.tasks` handle. */
	tasks: TasksRemote;
	/** Framework standard kit (scope `root`). */
	useWorkspaces: SnapshotSelectorHook<WorkspaceListState>;
}

// ── layout-only inline helpers (colors live in the stylesheet) ─────────────

const layout = {
	row: { display: "flex", alignItems: "center", gap: 8 },
	column: { display: "flex", flexDirection: "column", gap: 8 },
	spacer: { flex: 1 },
	field: { display: "flex", flexDirection: "column", gap: 4 },
} as const;

// ── helpers ────────────────────────────────────────────────────────────────

function taskBadge(task: TaskView): { cls: string; text: string } {
	if (task.state === "finished") return { cls: C.badgeDim, text: "已结束" };
	if (!task.enabled) return { cls: C.badgeDim, text: "已停用" };
	const remaining = Date.parse(task.scheduledAt) - Date.now();
	if (remaining <= 0) return { cls: C.badgeWarn, text: "待运行" };
	return { cls: C.badgeSuccess, text: "已启用" };
}

function runBadge(status: RunView["status"]): { cls: string; text: string } {
	switch (status) {
		case "running":
			return { cls: C.badgeSuccess, text: "运行中" };
		case "completed":
			return { cls: C.badgeSuccess, text: "成功" };
		case "failed":
			return { cls: C.badgeError, text: "失败" };
	}
}

function scheduleText(task: TaskView): string {
	if (task.kind === "at") return `一次性 · ${formatLocal(task.scheduledAt)}`;
	if (task.kind === "cron") return `Cron ${task.cron ?? "?"} · ${task.timeZone ?? "UTC"}`;
	return `每 ${task.everySeconds ?? "?"} 秒 · 创建锚定`;
}

function formatLocal(instant: string): string {
	const date = new Date(instant);
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nextRunText(task: TaskView): string {
	if (task.state === "finished") return "已结束";
	if (!task.enabled) return "已停用";
	const remaining = Date.parse(task.scheduledAt) - Date.now();
	if (remaining <= 0) return "已到期，等待调度";
	const minutes = Math.floor(remaining / 60_000);
	if (minutes < 1) return "即将运行";
	if (minutes < 60) return `${minutes} 分钟后`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} 小时后`;
	return `${Math.floor(hours / 24)} 天后`;
}

function errorText(result: RpcResult<unknown>): string {
	return result.ok ? "" : result.error.message;
}

function defaultTimeZone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
	} catch {
		return "UTC";
	}
}

// ── subviews ───────────────────────────────────────────────────────────────

interface RunHistoryProps {
	tasks: TasksRemote;
	task: TaskView;
	onBack: () => void;
}

function RunHistory({ tasks, task, onBack }: RunHistoryProps) {
	const [runs, setRuns] = useState<RunView[]>([]);
	const [error, setError] = useState("");
	const [expanded, setExpanded] = useState<string | undefined>();
	const [busy, setBusy] = useState(false);

	const refresh = useCallback(async () => {
		const result = await tasks.history(task.id);
		if (result.ok) setRuns(result.value);
		else setError(errorText(result));
	}, [tasks, task.id]);

	useEffect(() => {
		void refresh();
		const timer = setInterval(() => void refresh(), 10_000);
		return () => clearInterval(timer);
	}, [refresh]);

	return (
		<div style={layout.column}>
			<div style={layout.row}>
				<button type="button" className={C.btn} onClick={onBack}>
					← 返回
				</button>
				<span className={C.name}>{task.name} · 运行历史</span>
				<span style={layout.spacer} />
				<button
					type="button"
					className={C.btn}
					disabled={busy}
					onClick={() => {
						setBusy(true);
						void refresh().finally(() => setBusy(false));
					}}
				>
					刷新
				</button>
			</div>
			{error !== "" && <div className={C.error}>{error}</div>}
			{runs.length === 0 && <div className={C.empty}>暂无运行记录</div>}
			{runs.map((run) => {
				const badge = runBadge(run.status);
				return (
					<div key={run.id} className={C.row}>
						<span className={`${C.badge} ${badge.cls}`}>{badge.text}</span>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div className={C.meta}>
								{formatLocal(run.startedAt)}
								{run.finishedAt !== undefined ? ` → ${formatLocal(run.finishedAt)}` : ""}
								{run.triggeredBy === "manual" ? " · 手动" : run.overdue ? " · 补跑" : " · 定时"}
							</div>
							{expanded === run.id && (
								<div style={{ marginTop: 4 }}>
									{run.error !== undefined && (
										<div className={C.error} style={{ margin: "4px 0" }}>
											{run.error}
										</div>
									)}
									{run.output !== undefined && <pre className={C.output}>{run.output}</pre>}
									{run.output === undefined && run.error === undefined && <div className={C.meta}>（无输出）</div>}
								</div>
							)}
						</div>
						<button
							type="button"
							className={C.btn}
							onClick={() => setExpanded(expanded === run.id ? undefined : run.id)}
						>
							{expanded === run.id ? "收起" : "详情"}
						</button>
					</div>
				);
			})}
		</div>
	);
}

interface TaskFormProps {
	tasks: TasksRemote;
	projectPath: string;
	initial?: TaskView;
	onSaved: () => void;
	onCancel: () => void;
}

function TaskForm({ tasks, projectPath, initial, onSaved, onCancel }: TaskFormProps) {
	const [name, setName] = useState(initial?.name ?? "");
	const [prompt, setPrompt] = useState(initial?.prompt ?? "");
	const [kind, setKind] = useState<"at" | "every" | "cron">(initial?.kind ?? "at");
	const [atDate, setAtDate] = useState(() => {
		if (initial?.kind === "at") return initial.scheduledAt.slice(0, 10);
		const next = new Date(Date.now() + 60 * 60_000);
		const pad = (value: number) => String(value).padStart(2, "0");
		return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
	});
	const [atTime, setAtTime] = useState(() => {
		if (initial?.kind === "at") return initial.scheduledAt.slice(11, 16);
		const next = new Date(Date.now() + 60 * 60_000);
		const pad = (value: number) => String(value).padStart(2, "0");
		return `${pad(next.getHours())}:${pad(next.getMinutes())}`;
	});
	const [timeZone, setTimeZone] = useState(() => initial?.timeZone ?? defaultTimeZone());
	const [cron, setCron] = useState(initial?.kind === "cron" ? (initial.cron ?? "") : "");
	const [everyMinutes, setEveryMinutes] = useState(() => String((initial?.everySeconds ?? 1800) / 60));
	const [enabled, setEnabled] = useState(initial?.enabled ?? true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	const submit = async () => {
		if (name.trim() === "") {
			setError("请填写任务名称。");
			return;
		}
		if (prompt.trim() === "") {
			setError("请填写提示词。");
			return;
		}
		const base: CreateInput = {
			projectPath,
			name: name.trim(),
			prompt: prompt.trim(),
			kind,
			enabled,
		};
		let input: CreateInput;
		if (kind === "at") {
			input = { ...base, at: { date: atDate, time: `${atTime}:00`, time_zone: timeZone } };
		} else if (kind === "cron") {
			if (cron.trim() === "") {
				setError("请填写 Cron 表达式。");
				return;
			}
			input = { ...base, cron: cron.trim(), timeZone };
		} else {
			const minutes = Number(everyMinutes);
			if (!Number.isSafeInteger(minutes) || minutes * 60 < 300) {
				setError("周期必须不少于 5 分钟。");
				return;
			}
			input = { ...base, everySeconds: minutes * 60 };
		}
		setBusy(true);
		setError("");
		try {
			const result =
				initial === undefined
					? await tasks.create(input)
					: await tasks.update(initial.id, input as unknown as UpdateInput);
			if (result.ok) {
				onSaved();
			} else {
				setError(errorText(result));
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<div style={layout.column}>
			<div style={layout.row}>
				<button type="button" className={C.btn} onClick={onCancel}>
					← 返回
				</button>
				<span className={C.name}>{initial === undefined ? "新建定时任务" : "编辑任务"}</span>
			</div>
			<div style={layout.field}>
				<div className={C.label}>任务名称</div>
				<input
					className={C.input}
					value={name}
					onChange={(event) => setName(event.target.value)}
					placeholder="例如：每日代码检查"
				/>
			</div>
			<div style={layout.field}>
				<div className={C.label}>提示词（到点后会在项目目录中由全新 agent 会话执行）</div>
				<textarea
					className={C.textarea}
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					placeholder="例如：检查项目里的 TODO 注释，汇总成一份清单。"
				/>
			</div>
			<div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
				<div style={layout.field}>
					<div className={C.label}>调度类型</div>
					<div style={layout.row}>
						<label style={{ cursor: "pointer", ...layout.row, gap: 4 }}>
							<input type="radio" checked={kind === "at"} onChange={() => setKind("at")} /> 一次性
						</label>
						<label style={{ cursor: "pointer", ...layout.row, gap: 4 }}>
							<input type="radio" checked={kind === "every"} onChange={() => setKind("every")} /> 周期
						</label>
						<label style={{ cursor: "pointer", ...layout.row, gap: 4 }}>
							<input type="radio" checked={kind === "cron"} onChange={() => setKind("cron")} /> Cron
						</label>
					</div>
				</div>
			</div>
			{kind === "at" ? (
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
					<div style={{ ...layout.field, flex: 1, minWidth: 140 }}>
						<div className={C.label}>日期</div>
						<input className={C.input} type="date" value={atDate} onChange={(event) => setAtDate(event.target.value)} />
					</div>
					<div style={{ ...layout.field, flex: 1, minWidth: 100 }}>
						<div className={C.label}>时间（本地）</div>
						<input className={C.input} type="time" value={atTime} onChange={(event) => setAtTime(event.target.value)} />
					</div>
					<div style={{ ...layout.field, flex: 1, minWidth: 160 }}>
						<div className={C.label}>时区（IANA）</div>
						<input
							className={C.input}
							value={timeZone}
							onChange={(event) => setTimeZone(event.target.value)}
							placeholder="Asia/Shanghai"
						/>
					</div>
				</div>
			) : kind === "cron" ? (
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
					<div style={{ ...layout.field, flex: 2, minWidth: 220 }}>
						<div className={C.label}>Cron 表达式（分 时 日 月 周，如 0 9 * * 1-5）</div>
						<input
							className={C.input}
							value={cron}
							onChange={(event) => setCron(event.target.value)}
							placeholder="0 9 * * 1-5"
						/>
					</div>
					<div style={{ ...layout.field, flex: 1, minWidth: 160 }}>
						<div className={C.label}>时区（IANA）</div>
						<input
							className={C.input}
							value={timeZone}
							onChange={(event) => setTimeZone(event.target.value)}
							placeholder="Asia/Shanghai"
						/>
					</div>
				</div>
			) : (
				<div style={{ ...layout.field, maxWidth: 200 }}>
					<div className={C.label}>周期（分钟，不少于 5）</div>
					<input
						className={C.input}
						type="number"
						min={5}
						step={5}
						value={everyMinutes}
						onChange={(event) => setEveryMinutes(event.target.value)}
					/>
				</div>
			)}
			<label style={{ cursor: "pointer", ...layout.row, gap: 6 }}>
				<input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> 启用
			</label>
			{error !== "" && <div className={C.error}>{error}</div>}
			<div style={layout.row}>
				<button type="button" className={`${C.btn} ${C.btnPrimary}`} disabled={busy} onClick={() => void submit()}>
					{busy ? "保存中…" : "保存"}
				</button>
				<button type="button" className={C.btn} onClick={onCancel}>
					取消
				</button>
			</div>
		</div>
	);
}

// ── root panel ─────────────────────────────────────────────────────────────

type View = { kind: "list" } | { kind: "form"; task?: TaskView } | { kind: "history"; task: TaskView };

export function TasksFooterAction(props: TasksFooterActionProps) {
	const { wide, tasks } = props;
	const workspaceItems = props.useWorkspaces((state) => state.items);
	const recentWorkspaceId = props.useWorkspaces((state) => state.recentWorkspaceId);
	const [open, setOpen] = useState(false);
	const [projectPath, setProjectPath] = useState<string | undefined>();
	const [taskList, setTaskList] = useState<TaskView[]>([]);
	const [view, setView] = useState<View>({ kind: "list" });
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	const workspacePath = useMemo(() => {
		if (projectPath !== undefined) return projectPath;
		const recent = workspaceItems.find((item) => item.workspaceId === recentWorkspaceId);
		return recent?.path ?? workspaceItems[0]?.path;
	}, [projectPath, workspaceItems, recentWorkspaceId]);

	// Keep the selected path in sync when the workspace list settles.
	useEffect(() => {
		if (projectPath === undefined && workspacePath !== undefined) setProjectPath(workspacePath);
	}, [projectPath, workspacePath]);

	const refresh = useCallback(async () => {
		if (workspacePath === undefined) return;
		const result = await tasks.list(workspacePath);
		if (result.ok) setTaskList(result.value);
		else setError(errorText(result));
	}, [tasks, workspacePath]);

	// Refresh on open and every 10 seconds while open (runs settle asynchronously).
	useEffect(() => {
		if (!open) return;
		void refresh();
		const timer = setInterval(() => void refresh(), 10_000);
		return () => clearInterval(timer);
	}, [open, refresh]);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open]);

	const toggle = (id: string, enabled: boolean) => {
		setBusy(true);
		void tasks
			.update(id, { enabled })
			.then((result) => {
				if (!result.ok) setError(errorText(result));
			})
			.finally(() => {
				setBusy(false);
				void refresh();
			});
	};

	const remove = (task: TaskView) => {
		if (!window.confirm(`确定删除任务「${task.name}」及其运行历史吗？`)) return;
		setBusy(true);
		void tasks
			.delete(task.id)
			.then((result) => {
				if (!result.ok) setError(errorText(result));
			})
			.finally(() => {
				setBusy(false);
				void refresh();
			});
	};

	const runNow = (task: TaskView) => {
		setBusy(true);
		void tasks
			.runNow(task.id)
			.then((result) => {
				if (!result.ok) setError(errorText(result));
			})
			.finally(() => {
				setBusy(false);
				void refresh();
			});
	};

	return (
		<>
			{wide ? (
				<button
					type="button"
					className={C.trigger}
					title="定时任务"
					aria-haspopup="dialog"
					aria-expanded={open}
					onClick={() => setOpen((current) => !current)}
				>
					<IconChecklistOutline14 size={16} />
					<span className={C.triggerLabel}>定时任务</span>
				</button>
			) : (
				<button
					type="button"
					className={`${C.trigger} ${C.triggerRail}`}
					title="定时任务"
					aria-haspopup="dialog"
					aria-expanded={open}
					onClick={() => setOpen((current) => !current)}
				>
					<IconChecklistOutline14 size={18} />
				</button>
			)}
			{open && (
				// biome-ignore lint/a11y/noStaticElementInteractions: click-outside-to-close on a modal backdrop is a pointer affordance; the dialog itself is keyboard-closeable via Escape.
				// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click only closes; no keyboard semantics apply to the scrim itself.
				<div
					className={C.overlay}
					onClick={(event) => {
						if (event.target === event.currentTarget) setOpen(false);
					}}
				>
					<div className={C.card} role="dialog" aria-label="定时任务">
						<div className={C.header}>
							<IconChecklistOutline14 size={16} />
							<h2 className={C.title}>定时任务</h2>
							<button type="button" className={C.btn} onClick={() => setOpen(false)}>
								关闭
							</button>
						</div>
						<div className={C.body}>
							{error !== "" && (
								<div className={C.error}>
									{error}
									<button
										type="button"
										className={`${C.btn} ${C.btnDanger}`}
										style={{ marginLeft: 8 }}
										onClick={() => setError("")}
									>
										忽略
									</button>
								</div>
							)}
							{view.kind === "form" && (
								<TaskForm
									tasks={tasks}
									projectPath={workspacePath ?? ""}
									initial={view.task}
									onSaved={() => {
										setView({ kind: "list" });
										void refresh();
									}}
									onCancel={() => setView({ kind: "list" })}
								/>
							)}
							{view.kind === "history" && (
								<RunHistory tasks={tasks} task={view.task} onBack={() => setView({ kind: "list" })} />
							)}
							{view.kind === "list" && (
								<>
									<div style={layout.row}>
										<select
											className={C.select}
											style={{ flex: 1, minWidth: 0 }}
											value={workspacePath ?? ""}
											onChange={(event) => setProjectPath(event.target.value)}
										>
											{workspaceItems.map((item) => (
												<option key={item.workspaceId} value={item.path}>
													{item.title}
												</option>
											))}
										</select>
									</div>
									<div style={layout.row}>
										<span className={C.note}>
											项目：{workspacePath ?? "（未选择项目）"} · 每次运行会消耗默认模型的
											token，并会在对话列表中生成一条记录
										</span>
										<span style={layout.spacer} />
										<button
											type="button"
											className={`${C.btn} ${C.btnPrimary}`}
											disabled={workspacePath === undefined}
											onClick={() => setView({ kind: "form" })}
										>
											+ 新建任务
										</button>
									</div>
									{taskList.length === 0 && <div className={C.empty}>该项目还没有定时任务</div>}
									{taskList.map((task) => {
										const badge = taskBadge(task);
										return (
											<div key={task.id} className={C.row}>
												<span className={`${C.badge} ${badge.cls}`}>{badge.text}</span>
												<div style={{ flex: 1, minWidth: 0 }}>
													<div className={C.name}>{task.name}</div>
													<div className={C.meta}>
														{scheduleText(task)}
														{" · "}
														{nextRunText(task)}
													</div>
												</div>
												<button
													type="button"
													className={C.btn}
													disabled={busy}
													onClick={() => runNow(task)}
													title="立即运行一次（不影响原计划）"
												>
													运行
												</button>
												<button type="button" className={C.btn} onClick={() => setView({ kind: "form", task })}>
													编辑
												</button>
												<button type="button" className={C.btn} onClick={() => setView({ kind: "history", task })}>
													历史
												</button>
												<button type="button" className={C.btn} onClick={() => toggle(task.id, !task.enabled)}>
													{task.enabled ? "停用" : "启用"}
												</button>
												<button type="button" className={`${C.btn} ${C.btnDanger}`} onClick={() => remove(task)}>
													删除
												</button>
											</div>
										);
									})}
								</>
							)}
						</div>
						<div className={C.footer}>
							<span className={C.note}>
								定时任务仅在 DSH Web
								进程运行期间触发；重启后到期的任务会补跑一次并标记「补跑」。运行会话会出现在对应项目的对话列表中。
							</span>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
