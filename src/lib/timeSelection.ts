import { DateTime } from "luxon";

/**
 * Helpers for the two-click hour-range selection. A selection is stored as
 * two absolute-instant ISO strings (`selectionStart`/`selectionEnd`), each
 * matching the start of an hour slot (see `getHourRow`). Both bounds are
 * inclusive of their whole hour, so a range from 2pm to 4pm covers
 * 2:00–5:00 (3 selected tiles).
 */

export interface SelectionRange {
  startIso: string;
  endIso: string;
}

/** True when both bounds are set (a complete, two-click range). */
export function isCompleteSelection(
  startIso: string | null,
  endIso: string | null,
): boolean {
  return Boolean(startIso && endIso);
}

/**
 * Whether a given hour-slot instant (its `isoString`) falls inside the
 * selected range, inclusive of both endpoints.
 */
export function isSlotSelected(
  slotIso: string,
  startIso: string | null,
  endIso: string | null,
): boolean {
  if (!startIso || !endIso) return false;
  const slot = DateTime.fromISO(slotIso).toMillis();
  const start = DateTime.fromISO(startIso).toMillis();
  const end = DateTime.fromISO(endIso).toMillis();
  return slot >= start && slot <= end;
}

/** Number of whole hours covered by the selection (inclusive on both ends). */
export function selectionDurationHours(
  startIso: string,
  endIso: string,
): number {
  const start = DateTime.fromISO(startIso);
  const end = DateTime.fromISO(endIso);
  return Math.round(end.diff(start, "hours").hours) + 1;
}

/**
 * Formats the local start → end time for a given timezone, e.g.
 * "2:00 PM → 5:00 PM" or "11:00 PM → 2:00 AM +1" when the range crosses
 * into a later local calendar day.
 */
export function formatLocalRange(
  tz: string,
  startIso: string,
  endIso: string,
): string {
  const localStart = DateTime.fromISO(startIso).setZone(tz);
  // The range is inclusive of the end slot's whole hour, so the human-readable
  // end time is one hour past the end slot's start.
  const localEnd = DateTime.fromISO(endIso).setZone(tz).plus({ hours: 1 });

  const dayDiff = Math.round(
    localEnd.startOf("day").diff(localStart.startOf("day"), "days").days,
  );

  const startLabel = localStart.toFormat("h:mm a");
  const endLabel = localEnd.toFormat("h:mm a");
  const suffix = dayDiff > 0 ? ` +${dayDiff}` : "";

  return `${startLabel} → ${endLabel}${suffix}`;
}
