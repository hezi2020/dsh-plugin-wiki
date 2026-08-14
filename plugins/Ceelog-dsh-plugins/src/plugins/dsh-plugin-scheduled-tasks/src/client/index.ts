/**
 * Client plugin body: mounts the `tasks` remote namespace, then registers the
 * scheduled-tasks trigger into the sidebar footer action seat.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
// Load the sidebar slot declarations (module augmentation for the SlotMap).
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import type { TasksRemote } from "./remote.js";
import { injectStyles } from "./styles.js";
import { TasksFooterAction, type TasksFooterActionProps } from "./TasksPanel.js";
import { TYPERT_REMOTE } from "./typert-remote.js";

/** Services required before this plugin mounts. */
export const inject = ["slots", "remote"];

/** Mount the browser half. */
export async function apply(ctx: ClientContext) {
	injectStyles();
	await ctx.remote.$mount(TYPERT_REMOTE);
	ctx.slots.inject("sidebar.footer.action", () =>
		ctx.slots.register(
			{
				name: "sidebar.footer.action",
				id: "scheduled-tasks",
				label: () => "定时任务",
				inject: (): Pick<TasksFooterActionProps, "tasks"> => ({
					tasks: ctx.get("remote.tasks") as TasksRemote,
				}),
			},
			TasksFooterAction,
		),
	);
}
