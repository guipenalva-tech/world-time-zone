import { DateTime } from "luxon";
import type { City } from "@/types/city";
import citiesData from "@/data/cities.json";
import { getSearchableLocalizedNames } from "@/lib/i18nNames";
import { formatOffsetMinutes } from "@/lib/timezone";
import { ZONE_ABBREVIATIONS } from "@/lib/zoneAbbreviations";

const cities = citiesData as City[];

/** Lowercase + strip diacritics, e.g. "São Paulo" -> "sao paulo". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Search cities by name, country, alias, or curated localized name (from
 * `cityNames.json`) — so typing "Londres" finds London regardless of
 * which locale is currently active (a visitor may search in whatever
 * language they're comfortable with, or copy-paste a name they saw
 * elsewhere), in addition to the canonical English name always matching.
 * Case/accent-insensitive. Ranks prefix matches above substring matches,
 * then by population. Returns at most `limit` results (default 8).
 */
export function searchCities(query: string, limit = 8): City[] {
  const q = normalize(query);
  if (!q) return [];

  type Scored = { city: City; score: number };
  const results: Scored[] = [];

  for (const city of cities) {
    const name = normalize(city.name);
    const country = normalize(city.country);
    const aliases = (city.aliases ?? []).map(normalize);
    const localizedNames = getSearchableLocalizedNames(city).map(normalize);

    let score: number | null = null;

    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (aliases.some((a) => a.startsWith(q))) score = 2;
    else if (localizedNames.some((n) => n.startsWith(q))) score = 2;
    else if (country.startsWith(q)) score = 3;
    else if (name.includes(q)) score = 4;
    else if (aliases.some((a) => a.includes(q))) score = 5;
    else if (localizedNames.some((n) => n.includes(q))) score = 5;
    else if (country.includes(q)) score = 6;

    if (score !== null) results.push({ city, score });
  }

  results.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return b.city.population - a.city.population;
  });

  return results.slice(0, limit).map((r) => r.city);
}

/** Current abbreviation + offset for a timezone, as cached by {@link getCityZoneInfo}. */
interface ZoneSearchInfo {
  /** Luxon's `offsetNameShort` for the zone right now, e.g. "BST", "JST", "GMT+2". */
  abbreviation: string;
  /** Current UTC offset in minutes (can be negative, and non-multiples of 60). */
  offsetMinutes: number;
}

let zoneInfoCache: Map<string, ZoneSearchInfo> | null = null;
let zoneInfoCacheDate: string | null = null;

/**
 * Lazily-built, memoized map of IANA zone id -> { abbreviation,
 * offsetMinutes }, computed once per distinct zone instead of once per
 * city per keystroke (there are ~477 cities but far fewer distinct
 * zones). DST shifts these values at zone transitions, so the cache is
 * keyed by the ISO calendar date it was built for and rebuilt whenever
 * that date no longer matches "today" — this function only touches
 * `DateTime.now()` when actually called (never at module load), so it
 * stays SSR-safe.
 */
function getZoneInfoCache(): Map<string, ZoneSearchInfo> {
  const today = DateTime.now().toISODate();
  if (zoneInfoCache && zoneInfoCacheDate === today) return zoneInfoCache;

  const cache = new Map<string, ZoneSearchInfo>();
  for (const city of cities) {
    if (cache.has(city.timezone)) continue;
    const dt = DateTime.now().setZone(city.timezone);
    cache.set(city.timezone, {
      abbreviation: dt.offsetNameShort ?? formatOffsetMinutes(dt.offset),
      offsetMinutes: dt.offset,
    });
  }
  zoneInfoCache = cache;
  zoneInfoCacheDate = today;
  return cache;
}

/**
 * Current { abbreviation, offsetMinutes } for a city's timezone, read
 * from the lazily-built per-day cache described above. Exported so the
 * search UI can render e.g. "UTC+1 · BST" next to a result without
 * recomputing a Luxon DateTime per row.
 */
export function getCityZoneInfo(city: City): ZoneSearchInfo {
  const cache = getZoneInfoCache();
  const cached = cache.get(city.timezone);
  if (cached) return cached;
  // Defensive fallback — every city's zone is seeded on first build, so
  // this only runs if cities.json ever contains a zone id the cache
  // hasn't seen yet.
  const dt = DateTime.now().setZone(city.timezone);
  const info: ZoneSearchInfo = {
    abbreviation: dt.offsetNameShort ?? formatOffsetMinutes(dt.offset),
    offsetMinutes: dt.offset,
  };
  cache.set(city.timezone, info);
  return info;
}

/**
 * Parses a UTC/GMT offset expression to minutes, or returns null if
 * `raw` isn't one. Case-insensitive and tolerates spaces. Accepts:
 * "utc+2", "utc +2", "UTC-3", "gmt+5:30", "gmt-03:00", "+2", "-3", "utc"
 * (= 0), "gmt" (= 0). Only the colon-minutes form ("+5:30") and the
 * whole-hour form ("+2") are supported — not "+530" or "+5.5".
 */
function parseOffsetQuery(raw: string): number | null {
  const q = raw.replace(/\s+/g, "").toLowerCase();
  if (!q) return null;
  if (q === "utc" || q === "gmt") return 0;

  const match = /^(?:utc|gmt)?([+-])(\d{1,2})(?::(\d{2}))?$/.exec(q);
  if (!match) return null;

  const [, sign, hoursStr, minutesStr] = match;
  const hours = Number(hoursStr);
  const minutes = minutesStr ? Number(minutesStr) : 0;
  if (minutes > 59) return null;

  const total = hours * 60 + minutes;
  return sign === "-" ? -total : total;
}

/**
 * Collapses "_" and whitespace to a single space (after `normalize`), so
 * IANA zone matching treats them as equivalent — e.g. "sao_paulo" and
 * "sao paulo" both match "America/Sao_Paulo".
 */
function normalizeZone(s: string): string {
  return normalize(s).replace(/[_\s]+/g, " ");
}

/**
 * Like {@link searchCities}, but also matches cities by IANA timezone id
 * (e.g. "america/", "sao_paulo", "europe/london"), by the zone's current
 * short abbreviation (e.g. "JST", "EST", "BST", "GMT"), or by a UTC/GMT
 * offset expression (e.g. "utc+2", "gmt-03:00", "+5:30") — so a user who
 * only knows the timezone code, not the city name, can still find it.
 *
 * The zone's "current short abbreviation" comes from two sources, unioned:
 * Luxon's `offsetNameShort` (accurate for US zones and any zone CLDR
 * happens to name) and the curated {@link ZONE_ABBREVIATIONS} dataset
 * (covers the rest — JST, BST, IST, etc. — see zoneAbbreviations.ts for
 * why CLDR alone isn't enough here). Either source matching is enough;
 * neither replaces the other.
 *
 * Name/alias/country/localized-name matches are identical to
 * `searchCities` (same score bands, same logic) and always outrank pure
 * timezone matches: exact abbreviation (Luxon or curated) = 2, exact
 * offset = 3, IANA zone id prefix/substring = 5, abbreviation prefix = 5.
 * Ties within a score break by population descending, same as
 * `searchCities`.
 */
export function searchCitiesByNameOrTimeZone(query: string, limit = 8): City[] {
  const q = normalize(query);
  if (!q) return [];

  const zoneQ = normalizeZone(query);
  const offsetQ = parseOffsetQuery(query);
  // Curated abbreviations are exact-match, case-insensitive codes (e.g.
  // "jst" and "JST" both hit the "JST" entry) — looked up once per call,
  // not per city.
  const curated = ZONE_ABBREVIATIONS[query.trim().toUpperCase()];

  type Scored = { city: City; score: number };
  const results: Scored[] = [];

  for (const city of cities) {
    const name = normalize(city.name);
    const country = normalize(city.country);
    const aliases = (city.aliases ?? []).map(normalize);
    const localizedNames = getSearchableLocalizedNames(city).map(normalize);

    let score: number | null = null;

    // Same bands as searchCities, unchanged.
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (aliases.some((a) => a.startsWith(q))) score = 2;
    else if (localizedNames.some((n) => n.startsWith(q))) score = 2;
    else if (country.startsWith(q)) score = 3;
    else if (name.includes(q)) score = 4;
    else if (aliases.some((a) => a.includes(q))) score = 5;
    else if (localizedNames.some((n) => n.includes(q))) score = 5;
    else if (country.includes(q)) score = 6;

    const zoneInfo = getCityZoneInfo(city);
    const abbrevNorm = normalize(zoneInfo.abbreviation);
    const zoneIdNorm = normalizeZone(city.timezone);

    let zoneScore: number | null = null;
    if (abbrevNorm === q) zoneScore = 2;
    else if (curated && curated.zones.includes(city.timezone)) zoneScore = 2;
    else if (offsetQ !== null && zoneInfo.offsetMinutes === offsetQ) zoneScore = 3;
    else if (zoneIdNorm.includes(zoneQ)) zoneScore = 5;
    else if (abbrevNorm.startsWith(q)) zoneScore = 5;

    if (zoneScore !== null) {
      score = score === null ? zoneScore : Math.min(score, zoneScore);
    }

    if (score !== null) results.push({ city, score });
  }

  results.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return b.city.population - a.city.population;
  });

  return results.slice(0, limit).map((r) => r.city);
}

/** Top cities by population, for empty-state / quick-add suggestions. */
export function getPopularCities(limit = 20): City[] {
  return [...cities].sort((a, b) => b.population - a.population).slice(0, limit);
}

/** Look up a single city by id. */
export function getCityById(id: string): City | undefined {
  return cities.find((c) => c.id === id);
}

/**
 * Find the city whose timezone best matches the given IANA zone name
 * (used to seed the comparator with the user's detected location).
 * Falls back to the most populous city sharing the same UTC offset region
 * prefix (e.g. "America/") if no exact zone match exists, then to undefined.
 */
export function findCityByTimezone(timezone: string): City | undefined {
  const exact = cities
    .filter((c) => c.timezone === timezone)
    .sort((a, b) => b.population - a.population)[0];
  if (exact) return exact;
  return undefined;
}

export { cities };
