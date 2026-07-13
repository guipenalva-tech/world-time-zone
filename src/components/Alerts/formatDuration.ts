import type { CountdownParts } from "@/lib/alertScheduling";

/** Renders a countdown as "3h 12min" / "2d 4h" / "< 1 min" using the
 * `Alerts.duration.*` keys — shared by the city-alarm and business-hours
 * lists so both countdowns read identically. */
export function formatDuration(
  parts: CountdownParts,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (parts.days > 0) return t("duration.days", { count: parts.days, hours: parts.hours });
  if (parts.hours > 0) return t("duration.hoursMinutes", { hours: parts.hours, minutes: parts.minutes });
  if (parts.minutes > 0) return t("duration.minutes", { minutes: parts.minutes });
  return t("duration.lessThanMinute");
}
