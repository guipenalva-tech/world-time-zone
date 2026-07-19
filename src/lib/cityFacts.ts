/**
 * Pure fact-computation for a single city's /time/[city] page. Everything
 * here is derived from real data (cities.json + the existing dst/sun/
 * flightEstimate/timezone libs) at a given instant — no per-city templates,
 * no placeholder copy. `src/lib/cityNarrative.ts` turns these facts into
 * translatable sentences; this module only computes the numbers.
 */
import { DateTime } from "luxon";
import type { City } from "@/types/city";
import { cities, getCityById } from "@/lib/cities";
import { getZoneInfo, type ZoneInfo } from "@/lib/timezone";
import { getNextDstTransition, type DstTransition } from "@/lib/dst";
import { getSunTimes, type SunTimes } from "@/lib/sun";
import {
  haversineDistanceKm,
  estimateFlightDuration,
  estimateFlightPrice,
} from "@/lib/flightEstimate";
import { getCurrencyForCountry } from "@/lib/currency";

/** 8-10 globally-recognizable reference cities for the "time difference"
 * table. If the page's own city is one of these, it's swapped out (see
 * `pickReferenceCities`) so the table never compares a city to itself. */
export const REFERENCE_CITY_IDS = [
  "new-york",
  "london",
  "tokyo",
  "sao-paulo",
  "dubai",
  "sydney",
  "los-angeles",
  "paris",
  "mumbai",
  "singapore",
] as const;

/** Backfill pool used when the page's city collides with a reference city
 * (or, in rare cases, with the flight-hub list) — keeps the table/section
 * at a stable size instead of silently shrinking. */
const CITY_REPLACEMENT_POOL = [
  "hong-kong",
  "moscow",
  "mexico-city",
  "cairo",
  "toronto",
  "beijing",
  "istanbul",
] as const;

/** 3-4 major aviation hubs the /flights-style estimate is drawn from. */
export const FLIGHT_HUB_IDS = ["new-york", "london", "dubai", "singapore"] as const;

/** Curated set of ISO 3166-1 alpha-2 codes for nations whose entire
 * territory is islands (no land borders) — used only for a supplementary
 * narrative branch, not authoritative geography data. Deliberately
 * conservative: countries that share an island with another sovereign
 * state (e.g. Haiti/Dominican Republic, Ireland/UK) are left out. */
const ISLAND_NATION_CODES = new Set([
  "IS",
  "JP",
  "SG",
  "LK",
  "MG",
  "PH",
  "TW",
  "MT",
  "CY",
  "BH",
  "MV",
  "FJ",
  "JM",
  "TT",
  "BS",
  "CU",
  "MU",
  "SC",
  "KM",
  "WS",
  "TO",
  "VU",
  "SB",
  "PW",
  "FM",
  "MH",
  "KI",
  "NR",
  "TV",
  "NZ",
]);

/** Latitude beyond which day length swings dramatically enough (short
 * summers with near-midnight sun, short winter days) to be worth calling
 * out in the narrative on its own, even on a "normal" (non-polar) day. */
const EXTREME_LATITUDE_DEG = 55;

/** Number of distinct IANA timezones observed by the cities we track in
 * each country — computed once from cities.json itself (not a separate
 * geography dataset), so it only reflects the 477 cities in this app, not
 * every timezone a country legally recognizes. Good enough for a
 * comparative narrative fact ("Brazil spans 6 timezones among the cities
 * we track") without pretending to be a full geo-authority. */
const countryTimezoneCounts: Map<string, number> = (() => {
  const byCountry = new Map<string, Set<string>>();
  for (const c of cities) {
    const set = byCountry.get(c.countryCode) ?? new Set<string>();
    set.add(c.timezone);
    byCountry.set(c.countryCode, set);
  }
  const counts = new Map<string, number>();
  for (const [code, zones] of byCountry) counts.set(code, zones.size);
  return counts;
})();

function normalizeDiffHours(hours: number): number {
  let x = ((hours % 24) + 24) % 24;
  if (x > 12) x -= 24;
  return x;
}

/** Overlap (in hours) between two identical 9-hour business-day windows
 * (09:00-18:00) whose local clocks are `diffHours` apart. Linear model
 * (no wraparound past a single calendar day) — the same simplification
 * most "meeting planner" tools use: overlap shrinks to 0 once the offset
 * reaches 9h and stays there for anything further apart. */
function businessHourOverlapHours(diffHours: number): number {
  const normalized = normalizeDiffHours(diffHours);
  return Math.max(0, 9 - Math.abs(normalized));
}

export type DiffDirection = "ahead" | "behind" | "same";

export interface ReferenceCityDiff {
  city: City;
  /** Signed minutes: this city's offset minus the reference city's, at `now`. */
  diffMinutes: number;
  direction: DiffDirection;
  diffHoursAbs: number;
  diffMinutesAbs: number;
  meetingOverlapMinutes: number;
}

export interface FlightEstimateRow {
  hub: City;
  distanceKm: number;
  durationMinutes: number;
  priceMinUsd: number;
  priceMaxUsd: number;
}

export interface CityFacts {
  city: City;
  now: DateTime;
  zoneInfo: ZoneInfo;
  dstTransition: DstTransition | null;
  sun: SunTimes;
  todayISO: string;
  latAbs: number;
  hemisphere: "N" | "S";
  isExtremeLatitude: boolean;
  isFractionalOffset: boolean;
  /** abs(offsetMinutes % 60), e.g. 30 for UTC+5:30, 45 for UTC+5:45. */
  offsetFractionMinutes: number;
  countryTimezoneCount: number;
  isIslandNation: boolean;
  isChinaSpecialCase: boolean;
  referenceCities: ReferenceCityDiff[];
  primaryReference: City;
  /** A DST-observing city distinct from both `city` and `primaryReference`,
   * used to contrast against a city whose own offset never shifts. */
  dstContrastCity: City | null;
  sameTimezoneCities: City[];
  sameCountryCities: City[];
  flights: FlightEstimateRow[];
  currencyCode: string | undefined;
}

/** Picks `ids` by lookup, replacing any that collide with `excludeId` (or
 * are missing from the dataset) with the next unused city from
 * CITY_REPLACEMENT_POOL, so the resulting list never includes the page's
 * own city and never silently shrinks. */
function resolveCityList(ids: readonly string[], excludeId: string): City[] {
  const result: City[] = [];
  const used = new Set<string>([excludeId]);
  const pool = [...CITY_REPLACEMENT_POOL];

  for (const id of ids) {
    if (used.has(id)) continue;
    const city = getCityById(id);
    if (!city) continue;
    result.push(city);
    used.add(id);
  }

  while (result.length < ids.length) {
    const replacementId = pool.shift();
    if (!replacementId) break;
    if (used.has(replacementId)) continue;
    const replacement = getCityById(replacementId);
    if (!replacement) continue;
    result.push(replacement);
    used.add(replacementId);
  }

  return result;
}

function diffFor(city: City, reference: City, now: DateTime): ReferenceCityDiff {
  const cityOffset = now.setZone(city.timezone).offset;
  const refOffset = now.setZone(reference.timezone).offset;
  const diffMinutes = cityOffset - refOffset;
  const direction: DiffDirection = diffMinutes > 0 ? "ahead" : diffMinutes < 0 ? "behind" : "same";
  const absMinutes = Math.abs(diffMinutes);
  const overlapHours = businessHourOverlapHours(diffMinutes / 60);

  return {
    city: reference,
    diffMinutes,
    direction,
    diffHoursAbs: Math.floor(absMinutes / 60),
    diffMinutesAbs: absMinutes % 60,
    meetingOverlapMinutes: Math.round(overlapHours * 60),
  };
}

/**
 * Computes every real-data fact the /time/[city] page needs: current
 * offset/DST state, today's sun times, the reference-city time-difference
 * table (with business-hour meeting overlap), related cities, and rough
 * flight estimates from major hubs. Pure given `now` — same city + same
 * instant always produces the same facts, which is what makes the ISR
 * caching story for this route sane.
 */
export function buildCityFacts(city: City, now: DateTime = DateTime.utc()): CityFacts {
  const zoneInfo = getZoneInfo(city.timezone, now);
  const dstTransition = getNextDstTransition(city.timezone, now);

  const cityNow = now.setZone(city.timezone);
  const todayISO = cityNow.toISODate() ?? now.toISODate() ?? "1970-01-01";
  const sun = getSunTimes(city.lat, city.lon, todayISO, city.timezone);

  const latAbs = Math.round(Math.abs(city.lat) * 10) / 10;
  const hemisphere: "N" | "S" = city.lat >= 0 ? "N" : "S";
  const isExtremeLatitude = Math.abs(city.lat) >= EXTREME_LATITUDE_DEG;

  const offsetFractionMinutes = Math.abs(zoneInfo.offsetMinutes % 60);
  const isFractionalOffset = offsetFractionMinutes !== 0;

  const referenceCityRecords = resolveCityList(REFERENCE_CITY_IDS, city.id);
  const referenceCities = referenceCityRecords.map((ref) => diffFor(city, ref, now));

  const primaryReferenceId = city.id === "new-york" ? "london" : "new-york";
  const [primaryReference] = resolveCityList([primaryReferenceId], city.id);

  const dstContrastCandidates = ["london", "new-york", "sydney"];
  const dstContrastId = dstContrastCandidates.find(
    (id) => id !== city.id && id !== primaryReference?.id,
  );
  const dstContrastCity = dstContrastId ? (getCityById(dstContrastId) ?? null) : null;

  const sameTimezoneCities = cities
    .filter((c) => c.id !== city.id && c.timezone === city.timezone)
    .sort((a, b) => b.population - a.population)
    .slice(0, 8);

  const sameCountryCities = cities
    .filter((c) => c.id !== city.id && c.countryCode === city.countryCode)
    .sort((a, b) => b.population - a.population)
    .slice(0, 8);

  const flightHubs = resolveCityList(FLIGHT_HUB_IDS, city.id);
  const flights: FlightEstimateRow[] = flightHubs.map((hub) => {
    const distanceKm = haversineDistanceKm(city.lat, city.lon, hub.lat, hub.lon);
    const durationMinutes = estimateFlightDuration(distanceKm);
    const price = estimateFlightPrice(distanceKm, "in1Week", true);
    return {
      hub,
      distanceKm: Math.round(distanceKm),
      durationMinutes,
      priceMinUsd: price.minUsd,
      priceMaxUsd: price.maxUsd,
    };
  });

  return {
    city,
    now,
    zoneInfo,
    dstTransition,
    sun,
    todayISO,
    latAbs,
    hemisphere,
    isExtremeLatitude,
    isFractionalOffset,
    offsetFractionMinutes,
    countryTimezoneCount: countryTimezoneCounts.get(city.countryCode) ?? 1,
    isIslandNation: ISLAND_NATION_CODES.has(city.countryCode),
    isChinaSpecialCase: city.countryCode === "CN",
    referenceCities,
    primaryReference,
    dstContrastCity,
    sameTimezoneCities,
    sameCountryCities,
    flights,
    currencyCode: getCurrencyForCountry(city.countryCode),
  };
}
