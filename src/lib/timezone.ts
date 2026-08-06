import { DateTime } from "luxon";
import type { ZoneInfo } from "@/types/timezone";
import type { HourSlot } from "@/types/timezone";
import { ZONE_ABBREVIATIONS } from "@/lib/zoneAbbreviations";

/**
 * Maps an app locale (path segment, e.g. "pt") to the BCP-47 tag Luxon
 * should use for weekday/month names, so Brazilian Portuguese reads
 * naturally rather than European Portuguese.
 */
const LUXON_LOCALE_OVERRIDES: Record<string, string> = {
  pt: "pt-BR",
};

export function toLuxonLocale(locale: string): string {
  return LUXON_LOCALE_OVERRIDES[locale] ?? locale;
}

/**
 * Locales where Luxon's token formatter (`.toFormat()`) drops the CJK month
 * character ("月") whenever a day field is combined with a month field.
 * Root cause: `Intl.DateTimeFormat.formatToParts()` splits the bare numeral
 * and the "月" suffix into separate parts for these locales, and Luxon's
 * per-token substitution keeps only the part typed "month" — losing the
 * suffix. Luxon's own source documents a workaround for this for "ja" in
 * one internal code path (building the 12-month list for `Info.months()`),
 * but not in the general `.toFormat()` path, and the same Intl behavior
 * also affects "zh-CN"/"zh-TW", which Luxon doesn't special-case at all.
 */
const CJK_MONTH_WORKAROUND_LOCALES = new Set(["ja", "zh-CN", "zh-TW"]);

interface LocalizedDateParts {
  weekday?: "long";
  day: "numeric";
  month: "long" | "short";
  year?: "numeric";
}

/**
 * Formats a day/month(/weekday)(/year) combination, working around the CJK
 * month bug above by calling `Intl.DateTimeFormat` directly for affected
 * locales (its plain `.format()` isn't affected — only `formatToParts()`
 * mislabels the month, and that's what Luxon's token formatter relies on).
 * `luxonFormat` is the exact Luxon token string used for every other
 * locale, so output there is byte-for-byte unchanged.
 */
export function formatLocalizedDate(
  dt: DateTime,
  parts: LocalizedDateParts,
  luxonFormat: string,
): string {
  const locale = dt.locale;
  if (locale && CJK_MONTH_WORKAROUND_LOCALES.has(locale) && dt.isValid) {
    const options: Intl.DateTimeFormatOptions = {
      day: parts.day,
      month: parts.month,
    };
    if (parts.weekday) options.weekday = parts.weekday;
    if (parts.year) options.year = parts.year;
    return new Intl.DateTimeFormat(locale, options).format(dt.toJSDate());
  }
  return dt.toFormat(luxonFormat);
}

/**
 * Short month name only (e.g. "Jul", "7月"). Works around the same CJK
 * month bug as `formatLocalizedDate` above — for "ja" even a lone month
 * field is mislabeled by `formatToParts()`, so we bypass Luxon for the
 * affected locales here too.
 */
export function formatMonthShort(dt: DateTime): string {
  const locale = dt.locale;
  if (locale && CJK_MONTH_WORKAROUND_LOCALES.has(locale) && dt.isValid) {
    return new Intl.DateTimeFormat(locale, { month: "short" }).format(dt.toJSDate());
  }
  return dt.toFormat("MMM");
}

/**
 * Format a UTC offset in minutes as "UTC+5:30", "UTC-3", "UTC+0".
 */
export function formatOffsetMinutes(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0
    ? `UTC${sign}${hours}`
    : `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Format the current (or given instant's) UTC offset for a timezone,
 * e.g. "UTC-3", "UTC+5:30".
 */
export function formatOffset(tz: string, at?: DateTime): string {
  const dt = (at ?? DateTime.now()).setZone(tz);
  return formatOffsetMinutes(dt.offset);
}

/**
 * True for Luxon's fallback-style abbreviations ("GMT+9", "UTC+5:30") —
 * i.e. CLDR had no real name for this zone, so Luxon just re-stated the
 * offset. Redundant with `offsetFormatted`, and the signal we use to
 * know when to consult the curated {@link ZONE_ABBREVIATIONS} dataset
 * instead (see zoneAbbreviations.ts for why CLDR can't name most
 * non-US zones in this runtime).
 */
function isGenericOffsetAbbreviation(abbreviation: string): boolean {
  return /^(gmt|utc)[+-]/i.test(abbreviation);
}

/**
 * Reverse index built once from {@link ZONE_ABBREVIATIONS}: IANA zone id
 * -> the standard-time code and/or DST code that apply to it. Built
 * eagerly at module load (unlike the per-day cache in cities.ts) because
 * it's derived purely from the static curated dataset, not from
 * `DateTime.now()` — nothing here is date-dependent, so there's no
 * SSR-safety concern.
 */
const ZONE_TO_CURATED_CODES = (() => {
  const index = new Map<string, { std?: string; dst?: string }>();
  for (const [code, entry] of Object.entries(ZONE_ABBREVIATIONS)) {
    for (const zone of entry.zones) {
      const existing = index.get(zone) ?? {};
      if (entry.isDst) existing.dst = code;
      else existing.std = code;
      index.set(zone, existing);
    }
  }
  return index;
})();

/**
 * Curated code for `tz` matching `isDst`, or null if none exists. Used to
 * patch Luxon's abbreviation when it's a generic offset restatement (see
 * {@link isGenericOffsetAbbreviation}) — e.g. Asia/Tokyo -> "JST",
 * Europe/London -> "BST" only while it's actually in DST.
 */
function findCuratedAbbreviation(tz: string, isDst: boolean): string | null {
  const codes = ZONE_TO_CURATED_CODES.get(tz);
  if (!codes) return null;
  return (isDst ? codes.dst : codes.std) ?? null;
}

/**
 * Get the current offset, abbreviation (e.g. "BRT", "EST"), and DST status
 * for a timezone at a given instant (defaults to now). When Luxon's own
 * abbreviation is just a restated offset (see
 * {@link isGenericOffsetAbbreviation}), prefers the curated
 * {@link ZONE_ABBREVIATIONS} code for the zone's current DST state, if
 * one exists — this is the single seam all zone-abbreviation display in
 * the app (comparator rows, location cards, city facts, and the city
 * search dropdown) flows through, so the fix applies everywhere at once
 * rather than only in the search UI.
 */
export function getZoneInfo(tz: string, at?: DateTime): ZoneInfo {
  const dt = (at ?? DateTime.now()).setZone(tz);
  const offsetMinutes = dt.offset;
  const isDST = dt.isInDST;
  const luxonAbbreviation = dt.offsetNameShort ?? formatOffsetMinutes(offsetMinutes);
  const abbreviation = isGenericOffsetAbbreviation(luxonAbbreviation)
    ? (findCuratedAbbreviation(tz, isDST) ?? luxonAbbreviation)
    : luxonAbbreviation;
  return {
    abbreviation,
    offsetFormatted: formatOffsetMinutes(offsetMinutes),
    offsetMinutes,
    isDST,
  };
}

/**
 * Returns an anchor instant to start a comparator row from: `referenceIso`
 * (or now, if null/undefined) floored to the start of the hour, then shifted
 * back by `leadHours` so the "current" hour isn't pinned to the first tile.
 */
export function getRowAnchor(
  referenceIso: string | null | undefined,
  leadHours = 3,
): DateTime {
  const base = referenceIso ? DateTime.fromISO(referenceIso) : DateTime.now();
  const floored = (base.isValid ? base : DateTime.now()).startOf("hour");
  return floored.minus({ hours: leadHours });
}

/**
 * Build a row of hour slots for a timezone, starting at `baseDate` (an
 * absolute instant — typically produced by getRowAnchor). Each slot
 * represents one real hour advancing from baseDate, rendered in the local
 * wall-clock time of `tz`.
 */
export function getHourRow(
  tz: string,
  baseDate: DateTime,
  hours = 24,
  locale = "en",
): HourSlot[] {
  const now = DateTime.now();
  const slots: HourSlot[] = [];
  const luxonLocale = toLuxonLocale(locale);

  for (let h = 0; h < hours; h++) {
    const instant = baseDate.plus({ hours: h });
    const zoned = instant.setZone(tz).setLocale(luxonLocale);
    const nextInstant = instant.plus({ hours: 1 });

    const hour = zoned.hour;
    const isWeekend = zoned.weekday === 6 || zoned.weekday === 7;
    const isNight = hour >= 22 || hour < 6;
    const isBusinessHour = hour >= 9 && hour < 18;
    const isNewDay = hour === 0 && zoned.minute === 0;
    const isNow = instant <= now && now < nextInstant;

    slots.push({
      isoString: instant.toISO() ?? "",
      hour,
      minute: zoned.minute,
      weekday: zoned.toFormat("ccc"),
      day: zoned.day,
      month: formatMonthShort(zoned),
      isWeekend,
      isNight,
      isBusinessHour,
      isNewDay,
      isNow,
    });
  }

  return slots;
}
