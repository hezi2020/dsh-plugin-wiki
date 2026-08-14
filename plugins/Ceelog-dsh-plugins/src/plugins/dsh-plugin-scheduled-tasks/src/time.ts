/**
 * Strict calendar/time validation for task schedules.
 *
 * The rules mirror the `@deepseek-ai/dsh-schedule` protocol: targets are
 * canonical four-digit-year RFC 3339 UTC instants, local wall-clock values
 * require an explicit IANA time zone, daylight-saving gaps are rejected, and
 * overlaps choose the first (earlier) instant. No path consults the browser,
 * session, or process time zone.
 *
 * @module @opendsh/dsh-plugin-scheduled-tasks
 */
import { Cron } from "croner";

/** Minimum allowed fixed-rate interval in seconds (matches dsh-schedule). */
export const MIN_EVERY_INTERVAL_SECONDS = 300;

const MIN_FOUR_DIGIT_YEAR_MS = Date.parse("0001-01-01T00:00:00.000Z");
const MAX_FOUR_DIGIT_YEAR_MS = Date.parse("9999-12-31T23:59:59.999Z");

const UTC_INSTANT =
	/^(?!0000)\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;
const OFFSET_INSTANT = new RegExp(
	String.raw`^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})` +
		String.raw`T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})` +
		String.raw`(?:\.(?<fraction>\d{1,3}))?(?<zone>Z|(?<sign>[+-])` +
		String.raw`(?<offsetHour>\d{2}):(?<offsetMinute>\d{2}))$`,
);
const LOCAL_DATE = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/;
const LOCAL_TIME = /^(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?:\.(?<fraction>\d{1,3}))?$/;
const IANA_ZONE = /^[A-Za-z][A-Za-z0-9_+.-]*(?:\/[A-Za-z0-9_+.-]+)+$/;
const OFFSET_NAME = /^GMT(?:(?<sign>[+-])(?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2}))?)?$/;

/** Input failure carrying a stable machine-readable code. */
export class ScheduleInputError extends Error {
	readonly code: string;

	constructor(code: string, message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "ScheduleInputError";
		this.code = code;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
	const keys = Object.keys(value).sort();
	const wanted = [...expected].sort();
	return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

function groupNumber(groups: Record<string, string | undefined>, name: string): number {
	const value = groups[name];
	if (value === undefined) throw new ScheduleInputError("invalid_rule", "The at value has an invalid shape.");
	return Number(value);
}

/** Convert exact calendar fields to a UTC-shaped epoch while rejecting normalization. */
function calendarEpoch(parts: {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	millisecond: number;
}): number {
	const value = new Date(0);
	value.setUTCHours(0, 0, 0, 0);
	value.setUTCFullYear(parts.year, parts.month - 1, parts.day);
	value.setUTCHours(parts.hour, parts.minute, parts.second, parts.millisecond);
	const epoch = value.getTime();
	if (
		!Number.isFinite(epoch) ||
		value.getUTCFullYear() !== parts.year ||
		value.getUTCMonth() + 1 !== parts.month ||
		value.getUTCDate() !== parts.day ||
		value.getUTCHours() !== parts.hour ||
		value.getUTCMinutes() !== parts.minute ||
		value.getUTCSeconds() !== parts.second ||
		value.getUTCMilliseconds() !== parts.millisecond
	) {
		throw new ScheduleInputError("invalid_rule", "The at value must be a real ISO calendar date and time.");
	}
	return epoch;
}

function milliseconds(value: string | undefined): number {
	return value === undefined ? 0 : Number(value.padEnd(3, "0"));
}

/** Require a safe, representable, strictly future UTC target. */
export function futureInstant(epoch: number, now: number): string {
	if (
		!Number.isSafeInteger(now) ||
		!Number.isSafeInteger(epoch) ||
		epoch < MIN_FOUR_DIGIT_YEAR_MS ||
		epoch > MAX_FOUR_DIGIT_YEAR_MS
	) {
		throw new ScheduleInputError(
			"time_out_of_range",
			"The scheduled time must be representable as a four-digit-year RFC 3339 UTC instant.",
		);
	}
	if (epoch <= now) {
		throw new ScheduleInputError("not_future", "The scheduled time must be strictly in the future.");
	}
	const instant = new Date(epoch).toISOString();
	if (!UTC_INSTANT.test(instant)) {
		throw new ScheduleInputError(
			"time_out_of_range",
			"The scheduled time must be representable as a four-digit-year RFC 3339 UTC instant.",
		);
	}
	return instant;
}

/** Parse a strict RFC 3339 instant whose numeric offset is part of the input. */
function parseOffsetInstant(value: string): number {
	const groups = OFFSET_INSTANT.exec(value)?.groups;
	if (groups === undefined) {
		throw new ScheduleInputError(
			"invalid_rule",
			"at must use YYYY-MM-DDTHH:mm:ss with optional 1-3 digit fractional seconds and an explicit Z or numeric offset.",
		);
	}
	const parts = {
		year: groupNumber(groups, "year"),
		month: groupNumber(groups, "month"),
		day: groupNumber(groups, "day"),
		hour: groupNumber(groups, "hour"),
		minute: groupNumber(groups, "minute"),
		second: groupNumber(groups, "second"),
		millisecond: milliseconds(groups.fraction),
	};
	if (parts.year === 0 || parts.hour > 23 || parts.minute > 59 || parts.second > 59) {
		throw new ScheduleInputError("invalid_rule", "The at value must be a real ISO calendar date and time.");
	}
	const localEpoch = calendarEpoch(parts);
	if (groups.zone === "Z") return localEpoch;
	const offsetHour = groupNumber(groups, "offsetHour");
	const offsetMinute = groupNumber(groups, "offsetMinute");
	if (offsetHour > 23 || offsetMinute > 59 || (groups.sign === "-" && offsetHour === 0 && offsetMinute === 0)) {
		throw new ScheduleInputError("invalid_rule", "The at numeric offset is invalid.");
	}
	return localEpoch - (groups.sign === "+" ? 1 : -1) * (offsetHour * 60 + offsetMinute) * 60_000;
}

/** Validate and canonicalize one raw IANA time-zone selector. */
export function canonicalizeTimeZone(value: string): string {
	if (value.length === 0 || value.trim() !== value || (value !== "UTC" && !IANA_ZONE.test(value))) {
		throw new ScheduleInputError("invalid_time_zone", "time_zone must be UTC or a valid IANA Area/Location name.");
	}
	let canonical: string;
	try {
		canonical = new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
	} catch (error) {
		throw new ScheduleInputError("invalid_time_zone", "time_zone must be UTC or a valid IANA Area/Location name.", {
			cause: error,
		});
	}
	if (canonical !== "UTC" && !IANA_ZONE.test(canonical)) {
		throw new ScheduleInputError("invalid_time_zone", "time_zone must resolve to UTC or an IANA Area/Location name.");
	}
	return canonical;
}

interface LocalCalendarParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	millisecond: number;
}

/** Parse strict local calendar fields without consulting a process time zone. */
function parseLocalAt(value: { date: string; time: string }): LocalCalendarParts {
	const dateMatch = LOCAL_DATE.exec(value.date);
	const timeMatch = LOCAL_TIME.exec(value.time);
	const date = dateMatch?.groups;
	const time = timeMatch?.groups;
	if (date === undefined || time === undefined) {
		throw new ScheduleInputError(
			"invalid_rule",
			"Local at requires date YYYY-MM-DD and time HH:mm:ss with optional one-to-three digit milliseconds.",
		);
	}
	const parts = {
		year: groupNumber(date, "year"),
		month: groupNumber(date, "month"),
		day: groupNumber(date, "day"),
		hour: groupNumber(time, "hour"),
		minute: groupNumber(time, "minute"),
		second: groupNumber(time, "second"),
		millisecond: milliseconds(time.fraction),
	};
	if (parts.year === 0 || parts.hour > 23 || parts.minute > 59 || parts.second > 59) {
		throw new ScheduleInputError("invalid_rule", "The local at value must be a real ISO calendar date and time.");
	}
	calendarEpoch(parts);
	return parts;
}

interface LocalProjection {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	millisecond: number;
	offset: number;
}

/** Format one epoch into exact local fields and the zone offset that produced them. */
function localProjection(formatter: Intl.DateTimeFormat, epoch: number): LocalProjection {
	const values = Object.fromEntries(formatter.formatToParts(epoch).map((part) => [part.type, part.value]));
	const zoneName = values.timeZoneName;
	const offsetMatch = typeof zoneName === "string" ? OFFSET_NAME.exec(zoneName) : null;
	const offsetGroups = offsetMatch?.groups;
	if (offsetMatch === null || offsetGroups === undefined) {
		throw new ScheduleInputError("invalid_time_zone", "time_zone did not expose a usable UTC offset.");
	}
	const direction = offsetGroups.sign === "-" ? -1 : 1;
	const offset =
		offsetGroups.sign === undefined
			? 0
			: direction *
				(groupNumber(offsetGroups, "hour") * 3600 +
					groupNumber(offsetGroups, "minute") * 60 +
					Number(offsetGroups.second ?? "0")) *
				1000;
	return {
		year: Number(values.year),
		month: Number(values.month),
		day: Number(values.day),
		hour: Number(values.hour),
		minute: Number(values.minute),
		second: Number(values.second),
		millisecond: Number(values.fractionalSecond),
		offset,
	};
}

/** Resolve a local wall-clock value, choosing the first instant in an overlap and rejecting a gap. */
function resolveLocalInstant(parts: LocalCalendarParts, timeZone: string): number {
	const localEpoch = calendarEpoch(parts);
	const formatter = new Intl.DateTimeFormat("en-US-u-ca-iso8601-nu-latn", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		fractionalSecondDigits: 3,
		hourCycle: "h23",
		timeZoneName: "longOffset",
	});
	const offsets = new Set<number>();
	for (const delta of [-1_728_000, -864_000, 0, 864_000, 1_728_000]) {
		const sample = Math.min(MAX_FOUR_DIGIT_YEAR_MS, Math.max(MIN_FOUR_DIGIT_YEAR_MS, localEpoch + delta));
		offsets.add(localProjection(formatter, sample).offset);
	}
	const candidates: number[] = [];
	let outOfRange = false;
	for (const offset of offsets) {
		const candidate = localEpoch - offset;
		if (candidate < MIN_FOUR_DIGIT_YEAR_MS || candidate > MAX_FOUR_DIGIT_YEAR_MS) {
			outOfRange = true;
			continue;
		}
		const projected = localProjection(formatter, candidate);
		if (
			projected.year === parts.year &&
			projected.month === parts.month &&
			projected.day === parts.day &&
			projected.hour === parts.hour &&
			projected.minute === parts.minute &&
			projected.second === parts.second &&
			projected.millisecond === parts.millisecond
		) {
			candidates.push(candidate);
		}
	}
	const first = candidates.sort((left, right) => left - right)[0];
	if (first === undefined) {
		if (outOfRange) {
			throw new ScheduleInputError(
				"time_out_of_range",
				"The scheduled time must be representable as a four-digit-year RFC 3339 UTC instant.",
			);
		}
		throw new ScheduleInputError("invalid_rule", "The local at time does not exist in the selected time zone.");
	}
	return first;
}

/** One accepted absolute target: a strict instant string or a local calendar object. */
export type AtSelector = string | { date: string; time: string; time_zone: string };

/** Validate an absolute selector and compute its sole durable UTC target. */
export function resolveAtTarget(at: AtSelector, now: number): string {
	let target: number;
	if (typeof at === "string") {
		target = parseOffsetInstant(at);
	} else if (isRecord(at)) {
		if (!hasExactKeys(at, ["date", "time", "time_zone"])) {
			throw new ScheduleInputError("invalid_rule", "Local at must contain exactly date, time, and time_zone.");
		}
		if (typeof at.date !== "string" || typeof at.time !== "string") {
			throw new ScheduleInputError("invalid_rule", "Local at date and time must be strings.");
		}
		const rawTimeZone = at.time_zone;
		if (typeof rawTimeZone !== "string") {
			throw new ScheduleInputError("invalid_time_zone", "time_zone must be a string.");
		}
		target = resolveLocalInstant(parseLocalAt({ date: at.date, time: at.time }), canonicalizeTimeZone(rawTimeZone));
	} else {
		throw new ScheduleInputError("invalid_rule", "at must be an explicit-offset string or local calendar object.");
	}
	return futureInstant(target, now);
}

/** Validate a fixed-rate selector. */
export function validateEverySeconds(everySeconds: number): void {
	if (!Number.isSafeInteger(everySeconds)) {
		throw new ScheduleInputError("invalid_rule", "every_seconds must be a safe integer.");
	}
	if (everySeconds < MIN_EVERY_INTERVAL_SECONDS) {
		throw new ScheduleInputError("frequency_too_high", `every_seconds must be at least ${MIN_EVERY_INTERVAL_SECONDS}.`);
	}
}

/**
 * Advance one fixed-rate record from a decision time to its latest due
 * occurrence and the next anchor-aligned target, without enumerating missed
 * intervals.
 */
export function resolveEveryOccurrence(
	scheduledAt: string,
	everySeconds: number,
	now: number,
): { occurrenceAt: string; nextScheduledAt?: string } {
	const target = Date.parse(scheduledAt);
	const interval = everySeconds * 1000;
	if (!Number.isSafeInteger(now) || now < MIN_FOUR_DIGIT_YEAR_MS || now > MAX_FOUR_DIGIT_YEAR_MS) {
		throw new ScheduleInputError(
			"time_out_of_range",
			"The every decision time must be representable as a four-digit-year RFC 3339 UTC instant.",
		);
	}
	if (!Number.isSafeInteger(interval) || interval <= 0) {
		throw new ScheduleInputError("invalid_rule", "every interval milliseconds must be a positive safe integer.");
	}
	if (now < target) {
		throw new ScheduleInputError("invalid_rule", "every dispatch cannot precede the active scheduledAt.");
	}
	const occurrence = target + Math.floor((now - target) / interval) * interval;
	const occurrenceAt = new Date(occurrence).toISOString();
	const next = occurrence + interval;
	if (!Number.isSafeInteger(next) || next > MAX_FOUR_DIGIT_YEAR_MS) return { occurrenceAt };
	return { occurrenceAt, nextScheduledAt: new Date(next).toISOString() };
}

/** Parse a canonical UTC instant back to epoch milliseconds (already validated by the schema). */
export function instantEpoch(instant: string): number {
	return Date.parse(instant);
}

// ── cron ────────────────────────────────────────────────────────────────────

/** Validate one cron expression in one IANA zone; returns the trimmed expression. */
export function validateCron(expression: string, timeZone: string): string {
	const trimmed = expression.trim();
	if (trimmed.length === 0) {
		throw new ScheduleInputError("invalid_cron", "cron must be a non-empty expression.");
	}
	const canonical = canonicalizeTimeZone(timeZone);
	try {
		new Cron(trimmed, { timezone: canonical, paused: true });
	} catch (error) {
		throw new ScheduleInputError(
			"invalid_cron",
			`cron expression is invalid: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		);
	}
	return trimmed;
}

/**
 * Compute the first cron occurrence strictly after `after` and the one after
 * that (the next target). Both are absent when the pattern never fires again.
 */
export function resolveCronOccurrences(
	expression: string,
	timeZone: string,
	after: number,
): {
	occurrenceAt?: string;
	nextScheduledAt?: string;
} {
	const cron = new Cron(expression, { timezone: timeZone, paused: true });
	const occurrence = cron.nextRun(new Date(after));
	if (occurrence === null) return {};
	const occurrenceAt = occurrence.toISOString();
	const next = cron.nextRun(occurrence);
	if (next === null) return { occurrenceAt };
	return { occurrenceAt, nextScheduledAt: next.toISOString() };
}
