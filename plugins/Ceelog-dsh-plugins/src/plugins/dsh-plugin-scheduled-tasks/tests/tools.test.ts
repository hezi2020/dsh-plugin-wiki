import { describe, expect, it } from "vitest";
import { buildCreateInput } from "../src/tools.js";

describe("buildCreateInput", () => {
	it("accepts an every_seconds schedule with a prompt", () => {
		const built = buildCreateInput({ prompt: "run tests", every_seconds: 1800 });
		expect("input" in built).toBe(true);
		if ("input" in built) {
			expect(built.input.kind).toBe("every");
			expect(built.input.everySeconds).toBe(1800);
			expect(built.input.name).toBe("run tests");
		}
	});

	it("defaults the name to a prompt snippet for long prompts", () => {
		const built = buildCreateInput({ prompt: "x".repeat(100), every_seconds: 300 });
		if ("input" in built) expect(built.input.name.length).toBeLessThanOrEqual(41);
	});

	it("accepts a cron schedule with time_zone", () => {
		const built = buildCreateInput({ prompt: "daily", cron: "0 9 * * *", time_zone: "Asia/Shanghai" });
		if ("input" in built) {
			expect(built.input.kind).toBe("cron");
			expect(built.input.cron).toBe("0 9 * * *");
			expect(built.input.timeZone).toBe("Asia/Shanghai");
		}
	});

	it("rejects an empty prompt", () => {
		const built = buildCreateInput({ prompt: "   ", every_seconds: 300 });
		expect("error" in built).toBe(true);
		if ("error" in built) expect(built.error.code).toBe("invalid_prompt");
	});

	it("rejects multiple selectors", () => {
		const built = buildCreateInput({ prompt: "x", at: "2026-08-20T09:00:00Z", every_seconds: 300 });
		expect("error" in built).toBe(true);
		if ("error" in built) expect(built.error.code).toBe("invalid_selector");
	});

	it("rejects cron without time_zone", () => {
		const built = buildCreateInput({ prompt: "x", cron: "0 9 * * *" });
		expect("error" in built).toBe(true);
		if ("error" in built) expect(built.error.code).toBe("invalid_time_zone");
	});

	it("rejects a non-integer every_seconds", () => {
		const built = buildCreateInput({ prompt: "x", every_seconds: 300.5 });
		expect("error" in built).toBe(true);
		if ("error" in built) expect(built.error.code).toBe("invalid_rule");
	});

	it("honors an explicit project_path and enabled flag", () => {
		const built = buildCreateInput({ prompt: "x", at: "2026-08-20T09:00:00Z", project_path: "/p", enabled: false });
		if ("input" in built) {
			expect(built.input.projectPath).toBe("/p");
			expect(built.input.enabled).toBe(false);
		}
	});
});
