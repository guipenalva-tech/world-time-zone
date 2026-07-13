import { DateTime } from "luxon";
import type { HourSlot } from "@/types/timezone";
import type { HourFormat } from "@/stores/settingsStore";
import { getZoneInfo } from "@/lib/timezone";

/**
 * Signed hour difference between a city and a reference timezone at a given
 * instant (target - reference), accounting for DST and half/45-min offsets
 * (e.g. India, Nepal). Positive = ahead of the reference, negative = behind.
 */
export function computeHourDiff(
  tz: string,
  referenceTz: string,
  at: DateTime,
): number {
  const targetOffset = getZoneInfo(tz, at).offsetMinutes;
  const referenceOffset = getZoneInfo(referenceTz, at).offsetMinutes;
  return (targetOffset - referenceOffset) / 60;
}

/** Formats a signed hour diff as "+12h", "-1h", "+5.5h", trimming ".0". */
export function formatHourDiff(diffHours: number): string {
  const rounded = Math.round(diffHours * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const magnitude = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return `${sign}${magnitude}h`;
}

/** Inclusive index range (into a 24-slot row) of a contiguous window. */
export interface OverlapWindow {
  startIndex: number;
  endIndex: number;
}

/**
 * Finds the longest contiguous run of slot indices where every city's slot
 * is a local business hour at once — i.e. the best shared meeting window.
 * `citySlots` are parallel 24-slot rows (same length, same absolute instant
 * per index, per `getHourRow`). Returns null if no city set is given or no
 * index has full overlap.
 */
export function findCommonBusinessWindow(
  citySlots: HourSlot[][],
): OverlapWindow | null {
  if (citySlots.length === 0 || citySlots[0].length === 0) return null;
  const len = citySlots[0].length;

  let best: OverlapWindow | null = null;
  let runStart: number | null = null;

  for (let i = 0; i <= len; i++) {
    const allBusiness =
      i < len && citySlots.every((slots) => slots[i]?.isBusinessHour);

    if (allBusiness) {
      if (runStart === null) runStart = i;
    } else if (runStart !== null) {
      const candidateLength = i - runStart;
      const bestLength = best ? best.endIndex - best.startIndex + 1 : 0;
      if (candidateLength > bestLength) {
        best = { startIndex: runStart, endIndex: i - 1 };
      }
      runStart = null;
    }
  }

  return best;
}

/**
 * Formats a window's start → end as local clock time in `tz`, given the
 * anchor instant the 24-slot row was built from (see `getRowAnchor`).
 * `endIndex` is inclusive (the window covers the whole hour at that slot),
 * so the human-readable end boundary is one hour past it.
 */
export function formatWindowRange(
  anchor: DateTime,
  window: OverlapWindow,
  tz: string,
  hourFormat: HourFormat,
): string {
  const format = hourFormat === "24" ? "HH:mm" : "h:mm a";
  const start = anchor.plus({ hours: window.startIndex }).setZone(tz);
  const end = anchor.plus({ hours: window.endIndex + 1 }).setZone(tz);
  return `${start.toFormat(format)}–${end.toFormat(format)}`;
}
