import { describe, expect, it } from "vitest";
import {
	canonicalizeTimeZone,
	MIN_EVERY_INTERVAL_SECONDS,
	resolveAtTarget,
	resolveEveryOccurrence,
	ScheduleInputError,
	validateEverySeconds,
} from "../src/time.js";

const NOW = Date.parse("2026-08-14T09:00:00.000Z");

describe("resolveAtTarget", () => {
	it("accepts a canonical UTC instant", () => {
		expect(resolveAtTarget("2026-08-14T10:00:00Z", NOW)).toBe("2026-08-14T10:00:00.000Z");
	});

	it("accepts an explicit numeric offset", () => {
		expect(resolveAtTarget("2026-08-14T18:00:00+08:00", NOW)).toBe("2026-08-14T10:00:00.000Z");
	});

	it("rejects an offset-free string", () => {
		expect(() => resolveAtTarget("2026-08-14T10:00:00", NOW)).toThrowError(ScheduleInputError);
	});

	it("rejects non-future targets", () => {
		expect(() => resolveAtTarget("2026-08-14T08:00:00Z", NOW)).toThrowError(/strictly in the future/);
	});

	it("rejects normalized calendar dates", () => {
		expect(() => resolveAtTarget("2026-02-30T10:00:00Z", NOW)).toThrowError(ScheduleInputError);
	});

	it("resolves a local date/time with an explicit IANA zone", () => {
		expect(resolveAtTarget({ date: "2026-08-14", time: "18:00:00", time_zone: "Asia/Shanghai" }, NOW)).toBe(
			"2026-08-14T10:00:00.000Z",
		);
	});

	it("rejects local values without a time zone", () => {
		expect(() => resolveAtTarget({ date: "2026-08-14", time: "18:00:00", time_zone: "" }, NOW)).toThrowError(
			/time_zone must be UTC or a valid IANA/,
		);
	});

	it("rejects a wall-clock time inside a daylight-saving gap", () => {
		// America/New_York skipped 02:00–03:00 on 2026-03-08.
		expect(() =>
			resolveAtTarget({ date: "2026-03-08", time: "02:30:00", time_zone: "America/New_York" }, NOW),
		).toThrowError(/does not exist/);
	});

	it("chooses the first instant in a daylight-saving overlap", () => {
		// America/New_York repeated 01:00–02:00 on 2026-11-01; first instant is EDT (-04:00).
		expect(resolveAtTarget({ date: "2026-11-01", time: "01:30:00", time_zone: "America/New_York" }, NOW)).toBe(
			"2026-11-01T05:30:00.000Z",
		);
	});
});

describe("canonicalizeTimeZone", () => {
	it("accepts an IANA alias and returns a valid zone", () => {
		// ICU builds may keep the alias verbatim or canonicalize it; either is a
		// valid, non-empty Area/Location zone.
		const canonical = canonicalizeTimeZone("Asia/Calcutta");
		expect(canonical).toBe("Asia/Calcutta");
	});

	it("accepts UTC", () => {
		expect(canonicalizeTimeZone("UTC")).toBe("UTC");
	});

	it("rejects garbage", () => {
		expect(() => canonicalizeTimeZone("Not/AZone")).toThrowError(ScheduleInputError);
	});
});

describe("validateEverySeconds", () => {
	it("rejects intervals below the floor", () => {
		expect(() => validateEverySeconds(MIN_EVERY_INTERVAL_SECONDS - 1)).toThrowError(/at least/);
	});

	it("accepts the floor", () => {
		expect(() => validateEverySeconds(MIN_EVERY_INTERVAL_SECONDS)).not.toThrow();
	});

	it("rejects non-integers", () => {
		expect(() => validateEverySeconds(300.5)).toThrowError(/safe integer/);
	});
});

describe("resolveEveryOccurrence", () => {
	it("computes the latest due occurrence and the next target", () => {
		const { occurrenceAt, nextScheduledAt } = resolveEveryOccurrence(
			"2026-08-14T09:00:00.000Z",
			600,
			Date.parse("2026-08-14T09:25:00.000Z"),
		);
		expect(occurrenceAt).toBe("2026-08-14T09:20:00.000Z");
		expect(nextScheduledAt).toBe("2026-08-14T09:30:00.000Z");
	});

	it("never enumerates missed intervals (jump straight to the latest occurrence)", () => {
		const { occurrenceAt, nextScheduledAt } = resolveEveryOccurrence(
			"2026-08-14T09:00:00.000Z",
			600,
			Date.parse("2026-08-14T13:45:00.000Z"),
		);
		expect(occurrenceAt).toBe("2026-08-14T13:40:00.000Z");
		expect(nextScheduledAt).toBe("2026-08-14T13:50:00.000Z");
	});

	it("rejects a decision time before the anchor", () => {
		expect(() =>
			resolveEveryOccurrence("2026-08-14T10:00:00.000Z", 600, Date.parse("2026-08-14T09:00:00.000Z")),
		).toThrowError(/cannot precede/);
	});
});
