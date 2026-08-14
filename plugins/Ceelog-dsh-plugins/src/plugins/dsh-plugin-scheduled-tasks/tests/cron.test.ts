import { describe, expect, it } from "vitest";
import { resolveCronOccurrences, validateCron } from "../src/time.js";

const NOW = Date.parse("2026-08-14T10:00:00.000Z");

describe("validateCron", () => {
	it("accepts a valid five-field expression", () => {
		expect(validateCron("0 9 * * 1-5", "Asia/Shanghai")).toBe("0 9 * * 1-5");
	});

	it("rejects a malformed expression", () => {
		expect(() => validateCron("not a cron", "UTC")).toThrowError(/cron expression is invalid/);
	});

	it("rejects an invalid time zone", () => {
		expect(() => validateCron("0 9 * * *", "Not/AZone")).toThrowError(/time_zone/);
	});
});

describe("resolveCronOccurrences", () => {
	it("computes the next 09:00 in the task time zone", () => {
		// 09:00 Asia/Shanghai = 01:00Z; next after 10:00Z is tomorrow 01:00Z.
		const { occurrenceAt, nextScheduledAt } = resolveCronOccurrences("0 9 * * *", "Asia/Shanghai", NOW);
		expect(occurrenceAt).toBe("2026-08-15T01:00:00.000Z");
		expect(nextScheduledAt).toBe("2026-08-16T01:00:00.000Z");
	});

	it("handles minute steps strictly after the reference", () => {
		const { occurrenceAt, nextScheduledAt } = resolveCronOccurrences(
			"*/15 * * * *",
			"UTC",
			Date.parse("2026-08-14T10:45:00.000Z"),
		);
		expect(occurrenceAt).toBe("2026-08-14T11:00:00.000Z");
		expect(nextScheduledAt).toBe("2026-08-14T11:15:00.000Z");
	});

	it("handles weekday lists", () => {
		// Monday-Friday 09:30 UTC; reference is a Friday 10:00Z -> next is Monday.
		const { occurrenceAt } = resolveCronOccurrences("30 9 * * 1-5", "UTC", Date.parse("2026-08-14T10:00:00.000Z"));
		expect(occurrenceAt).toBe("2026-08-17T09:30:00.000Z");
	});

	it("handles leap-day patterns", () => {
		const { occurrenceAt } = resolveCronOccurrences("0 0 29 2 *", "UTC", NOW);
		expect(occurrenceAt).toBe("2028-02-29T00:00:00.000Z");
	});

	it("returns no occurrence for a pattern that never fires", () => {
		const result = resolveCronOccurrences("0 0 30 2 *", "UTC", NOW);
		expect(result.occurrenceAt).toBeUndefined();
		expect(result.nextScheduledAt).toBeUndefined();
	});
});
