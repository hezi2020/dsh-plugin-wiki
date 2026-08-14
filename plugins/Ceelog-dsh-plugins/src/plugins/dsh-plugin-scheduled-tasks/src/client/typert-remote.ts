/**
 * Client TYPERT_REMOTE face: installs the `tasks` namespace on the client
 * through `ctx.remote.$mount(...)`, mirroring the host TYPERT manifest
 * one-to-one so both directions validate with the same strict codecs.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */

import type { TypertRemoteContribution } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";
import { createInputSchema, deleteResultSchema, runViewSchema, taskViewSchema, updateInputSchema } from "../schemas.js";

const PKG = "@opendsh/dsh-plugin-scheduled-tasks";

const direct: { kind: "direct" } = { kind: "direct" };

function jsonCodec(typeSymbol: string, schema: z.ZodType) {
	return { mode: "strict" as const, typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

function optionalJsonCodec(typeSymbol: string, schema: z.ZodType) {
	return {
		mode: "strict" as const,
		typeSymbol: `${PKG}/types#${typeSymbol}`,
		schema: schema.optional(),
	};
}

function result(typeSymbol: string, schema: z.ZodType) {
	return { mode: "strict" as const, typeSymbol: `${PKG}/types#${typeSymbol}`, schema };
}

/** Remote contribution consumed by `ctx.remote.$mount(...)`. */
export const TYPERT_REMOTE: TypertRemoteContribution = {
	package: PKG,
	descriptors: [
		{
			id: `${PKG}#tasks/list`,
			service: "tasks",
			namespace: "tasks",
			method: "list",
			invocation: direct,
			parameters: [
				{
					name: "projectPath",
					wire: "projectPath",
					source: "json",
					acceptsUndefined: true,
					codec: optionalJsonCodec("ProjectPath", z.string()),
				},
			],
			result: result("TaskView[]", z.array(taskViewSchema)),
		},
		{
			id: `${PKG}#tasks/create`,
			service: "tasks",
			namespace: "tasks",
			method: "create",
			invocation: direct,
			parameters: [
				{
					name: "input",
					wire: "input",
					source: "json",
					codec: jsonCodec("CreateInput", createInputSchema),
				},
			],
			result: result("TaskView", taskViewSchema),
		},
		{
			id: `${PKG}#tasks/update`,
			service: "tasks",
			namespace: "tasks",
			method: "update",
			invocation: direct,
			parameters: [
				{
					name: "id",
					wire: "id",
					source: "json",
					codec: jsonCodec("TaskId", z.string()),
				},
				{
					name: "patch",
					wire: "patch",
					source: "json",
					codec: jsonCodec("UpdateInput", updateInputSchema),
				},
			],
			result: result("TaskView", taskViewSchema),
		},
		{
			id: `${PKG}#tasks/delete`,
			service: "tasks",
			namespace: "tasks",
			method: "delete",
			invocation: direct,
			parameters: [
				{
					name: "id",
					wire: "id",
					source: "json",
					codec: jsonCodec("TaskId", z.string()),
				},
			],
			result: result("DeleteResult", deleteResultSchema),
		},
		{
			id: `${PKG}#tasks/runNow`,
			service: "tasks",
			namespace: "tasks",
			method: "runNow",
			invocation: direct,
			parameters: [
				{
					name: "id",
					wire: "id",
					source: "json",
					codec: jsonCodec("TaskId", z.string()),
				},
			],
			result: result("RunView", runViewSchema),
		},
		{
			id: `${PKG}#tasks/history`,
			service: "tasks",
			namespace: "tasks",
			method: "history",
			invocation: direct,
			parameters: [
				{
					name: "id",
					wire: "id",
					source: "json",
					codec: jsonCodec("TaskId", z.string()),
				},
			],
			result: result("RunView[]", z.array(runViewSchema)),
		},
	],
};
