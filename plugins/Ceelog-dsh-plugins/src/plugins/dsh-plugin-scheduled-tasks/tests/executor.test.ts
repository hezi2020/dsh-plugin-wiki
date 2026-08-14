import { describe, expect, it } from "vitest";
import { describeReason, summarizeRun } from "../src/executor.js";

/**
 * Real-world shape captured from a web-profile run: the agent loop starts its
 * first turn BEFORE the run prompt is queued, so `turn/start` sits before
 * `firstSeq` (the seq of the followup user message). The summary must still
 * capture the assistant text and the final turn/end reason.
 */
const REAL_SHAPE = [
	{ type: "turn/start", seq: 4, data: { turn: 1 } },
	{ type: "step/start", seq: 6, data: { turn: 1, step: 1 } },
	{ type: "user/message", seq: 7, data: { content: [{ type: "text", text: "the prompt" }] } },
	{ type: "user/message", seq: 8, data: { content: [{ type: "text", text: "injected context" }] } },
	{
		type: "assistant/message",
		seq: 51,
		data: {
			message: {
				content: [
					{ type: "reasoning", text: "hmm" },
					{ type: "text", text: "OK" },
				],
			},
		},
	},
	{ type: "step/end", seq: 52, data: { turn: 1, step: 1 } },
	// turn/end data nests the reason: { turn, reason: { kind, ... } }
	{ type: "turn/end", seq: 53, data: { turn: 1, reason: { kind: "completed" } } },
];

describe("summarizeRun", () => {
	it("captures output and reason when turn/start precedes firstSeq", () => {
		const firstSeq = 7; // seq of the followup user message
		const summary = summarizeRun(REAL_SHAPE, firstSeq);
		expect(summary.text).toBe("OK");
		expect(summary.reason?.kind).toBe("completed");
	});

	it("keeps the last assistant text across multiple messages", () => {
		const events = [
			{ type: "assistant/message", seq: 10, data: { message: { content: [{ type: "text", text: "first" }] } } },
			{ type: "assistant/message", seq: 20, data: { message: { content: [{ type: "text", text: "second" }] } } },
		];
		expect(summarizeRun(events, 0).text).toBe("second");
	});

	it("returns no reason when no turn ended in the window", () => {
		expect(
			summarizeRun([{ type: "assistant/message", seq: 10, data: { message: { content: [] } } }], 0).reason,
		).toBeUndefined();
	});
});

describe("describeReason", () => {
	it("returns undefined for a completed turn", () => {
		expect(describeReason({ kind: "completed" })).toBeUndefined();
	});

	it("renders an error reason with code and message", () => {
		expect(describeReason({ kind: "error", error: { code: "AUTH", message: "API key is invalid" } })).toBe(
			"AUTH: API key is invalid",
		);
	});

	it("renders a blocked turn explicitly", () => {
		expect(describeReason({ kind: "blocked" })).toContain("blocked");
	});

	it("renders an unknown reason as JSON", () => {
		expect(describeReason({ kind: "plugin-weird" })).toContain("plugin-weird");
	});

	it("renders missing reason as no-outcome", () => {
		expect(describeReason(undefined)).toContain("no turn outcome");
	});
});
