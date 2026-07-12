import { DateTime } from "luxon";
import type { HourFormat } from "@/stores/settingsStore";

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

/** Local business-hours coverage of a selected range, for a given timezone. */
export type BusinessStatus = "business" | "partial" | "outside";

/**
 * Classifies how much of a selected `[startIso, endIso]` range (inclusive,
 * hour-aligned) falls within local business hours (09:00–18:00, mirroring
 * `HourSlot.isBusinessHour`) once converted to `tz`.
 *
 * Handles ranges that cross local midnight naturally, since each hour is
 * evaluated independently in the target zone. Half-hour-offset zones (e.g.
 * UTC+5:30) are handled the same way `HourSlot` does: only the local hour
 * component is checked, minutes are ignored.
 */
export function getRangeBusinessStatus(
  tz: string,
  startIso: string,
  endIso: string,
): BusinessStatus {
  const start = DateTime.fromISO(startIso);
  const end = DateTime.fromISO(endIso);
  if (!start.isValid || !end.isValid) return "outside";

  const hours = Math.max(0, Math.round(end.diff(start, "hours").hours));
  let businessCount = 0;
  const total = hours + 1;

  for (let h = 0; h < total; h++) {
    const local = start.plus({ hours: h }).setZone(tz);
    if (local.hour >= 9 && local.hour < 18) businessCount += 1;
  }

  if (businessCount === total) return "business";
  if (businessCount === 0) return "outside";
  return "partial";
}

/**
 * Formats the local start → end time for a given timezone, e.g.
 * "2:00 PM → 5:00 PM" or "11:00 PM → 2:00 AM +1" when the range crosses
 * into a later local calendar day. Respects the given hour format
 * ("12" -> "h:mm a", "24" -> "HH:mm").
 */
export function formatLocalRange(
  tz: string,
  startIso: string,
  endIso: string,
  hourFormat: HourFormat = "12",
): string {
  const localStart = DateTime.fromISO(startIso).setZone(tz);
  // The range is inclusive of the end slot's whole hour, so the human-readable
  // end time is one hour past the end slot's start.
  const localEnd = DateTime.fromISO(endIso).setZone(tz).plus({ hours: 1 });

  const dayDiff = Math.round(
    localEnd.startOf("day").diff(localStart.startOf("day"), "days").days,
  );

  const timeFormat = hourFormat === "24" ? "HH:mm" : "h:mm a";
  const startLabel = localStart.toFormat(timeFormat);
  const endLabel = localEnd.toFormat(timeFormat);
  const suffix = dayDiff > 0 ? ` +${dayDiff}` : "";

  return `${startLabel} → ${endLabel}${suffix}`;
}
