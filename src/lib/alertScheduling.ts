/**
 * Pure occurrence math for the three alert types on /alerts (city alarms,
 * business-hours warnings, and the once/moment checks DST reminders use).
 * Framework-free and unit-testable in isolation — the scheduler component
 * and the list UIs both build on this so "when does this next fire" is
 * computed identically everywhere.
 */
import { DateTime } from "luxon";

/** If a scheduled instant was missed by more than this, don't fire it late
 * (e.g. the tab was asleep for days) — see AlertScheduler. */
export const CATCH_UP_MS = 60 * 60 * 1000;

export interface Occurrence {
  /** Most recent scheduled instant at or before `now`, or null if the alarm
   * hasn't had an occurrence yet (or is a completed one-time alarm). */
  prev: DateTime | null;
  /** Next scheduled instant strictly after `now`, or null if the alarm
   * won't recur (a one-time alarm that already fired, or is due right now). */
  next: DateTime | null;
}

/** Every day at `hour`:`minute` local time in `tz`. */
export function dailyOccurrence(
  tz: string,
  hour: number,
  minute: number,
  now: DateTime,
): Occurrence {
  const zoned = now.setZone(tz);
  const todayAt = zoned.set({ hour, minute, second: 0, millisecond: 0 });
  if (todayAt <= zoned) {
    return { prev: todayAt, next: todayAt.plus({ days: 1 }) };
  }
  return { prev: todayAt.minus({ days: 1 }), next: todayAt };
}

/**
 * A single occurrence at `hour`:`minute` local time in `tz` — the next
 * upcoming one, or (once it has passed) permanently "completed" once
 * `alreadyFired` is true.
 */
export function onceOccurrence(
  tz: string,
  hour: number,
  minute: number,
  now: DateTime,
  alreadyFired: boolean,
): Occurrence {
  if (alreadyFired) return { prev: null, next: null };
  const zoned = now.setZone(tz);
  const todayAt = zoned.set({ hour, minute, second: 0, millisecond: 0 });
  if (todayAt <= zoned) return { prev: todayAt, next: null };
  return { prev: null, next: todayAt };
}

function isWeekday(dt: DateTime): boolean {
  return dt.weekday >= 1 && dt.weekday <= 5;
}

/** Business hours (9:00-18:00 local, Mon-Fri) end warning, `leadMinutes`
 * before 18:00 local, every business day. */
export function businessHoursOccurrence(
  tz: string,
  leadMinutes: number,
  now: DateTime,
): Occurrence {
  const zoned = now.setZone(tz);

  function fireTimeFor(day: DateTime): DateTime {
    return day
      .set({ hour: 18, minute: 0, second: 0, millisecond: 0 })
      .minus({ minutes: leadMinutes });
  }

  let next: DateTime | null = null;
  for (let i = 0; i < 8 && !next; i++) {
    const day = zoned.startOf("day").plus({ days: i });
    if (!isWeekday(day)) continue;
    const candidate = fireTimeFor(day);
    if (candidate > zoned) next = candidate;
  }

  let prev: DateTime | null = null;
  for (let i = 0; i < 8 && !prev; i++) {
    const day = zoned.startOf("day").minus({ days: i });
    if (!isWeekday(day)) continue;
    const candidate = fireTimeFor(day);
    if (candidate <= zoned) prev = candidate;
  }

  return { prev, next };
}

export interface FireCheck {
  fire: boolean;
  /** ISO key identifying the occurrence checked, for `lastFiredKey` bookkeeping. */
  key: string | null;
}

/**
 * Should a one-off scheduled instant `at` fire right now? Yes if it's at or
 * before `now`, wasn't already fired (its ISO key doesn't match
 * `lastFiredKey`), and wasn't missed by more than `CATCH_UP_MS` (a stale
 * miss is silently skipped rather than fired late, and its key intentionally
 * isn't recorded so a future correction — e.g. the clock catching up — can
 * still fire it once within the window).
 */
export function shouldFireOnce(
  at: DateTime,
  now: DateTime,
  lastFiredKey: string | null,
): FireCheck {
  const key = at.toUTC().toISO();
  if (key === lastFiredKey) return { fire: false, key };
  const diffMs = now.toMillis() - at.toMillis();
  if (diffMs < 0 || diffMs > CATCH_UP_MS) return { fire: false, key };
  return { fire: true, key };
}

/** Same as {@link shouldFireOnce}, but for a recurring `Occurrence` (fires
 * against its `prev` slot, or never if there isn't one due yet). */
export function shouldFire(
  occurrence: Occurrence,
  lastFiredKey: string | null,
  now: DateTime,
): FireCheck {
  if (!occurrence.prev) return { fire: false, key: null };
  return shouldFireOnce(occurrence.prev, now, lastFiredKey);
}
