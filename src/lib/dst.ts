/**
 * Daylight-saving-time transition detection for the Alerts view (/alerts).
 * Pure, framework-free, and unit-testable in isolation (no DOM/React) —
 * works for any IANA timezone by sampling its UTC offset day by day (offset
 * is purely a function of the instant + zone, so this needs no knowledge of
 * any particular country's DST rules) and refining the crossing to the
 * minute with a binary search.
 */
import { DateTime } from "luxon";

export type DstDirection = "forward" | "backward";

export interface DstTransition {
  /** The exact instant (UTC) the offset changes, accurate to the minute. */
  at: DateTime;
  /** New offset minus old offset, in minutes (e.g. +60 spring forward, -60 fall back). */
  offsetChangeMinutes: number;
  /** "forward" = clocks jump ahead (entering DST); "backward" = clocks fall back (exiting DST). */
  direction: DstDirection;
}

/** How far ahead to scan for a transition before giving up (a bit over a year). */
const SCAN_DAYS = 366;

function offsetAt(tz: string, instant: DateTime): number {
  return instant.setZone(tz).offset;
}

/**
 * Finds the next DST transition for `tz` strictly after `from` (defaults to
 * now). Scans day by day for up to `SCAN_DAYS`, then binary-searches the
 * day where the offset changed down to the minute.
 *
 * Returns null if no offset change is found in the window — i.e. the zone
 * doesn't observe DST at all (most of Asia, Brazil since 2019, etc.).
 */
export function getNextDstTransition(
  tz: string,
  from: DateTime = DateTime.utc(),
): DstTransition | null {
  const start = from.toUTC();
  let prevInstant = start;
  let prevOffset = offsetAt(tz, prevInstant);

  for (let day = 1; day <= SCAN_DAYS; day++) {
    const instant = start.plus({ days: day });
    const offset = offsetAt(tz, instant);

    if (offset !== prevOffset) {
      // Binary search (prevInstant, instant] for the exact minute the
      // offset flips: `lo` always has the old offset, `hi` the new one.
      let lo = prevInstant;
      let hi = instant;
      while (hi.diff(lo, "minutes").minutes > 1) {
        const mid = lo.plus({ milliseconds: (hi.toMillis() - lo.toMillis()) / 2 });
        if (offsetAt(tz, mid) === prevOffset) {
          lo = mid;
        } else {
          hi = mid;
        }
      }

      const change = offset - prevOffset;
      return {
        at: hi,
        offsetChangeMinutes: change,
        direction: change > 0 ? "forward" : "backward",
      };
    }

    prevInstant = instant;
    prevOffset = offset;
  }

  return null;
}
