/**
 * Locale-aware display names for cities and countries.
 *
 * Why this exists: `cities.json`'s `name`/`country` fields are the English
 * canonical form used everywhere internally (slugs, matching, sorting).
 * For SEO the *visible* name on a /time/[city] page needs to be the name a
 * search engine user in that locale actually types — "Londres" not
 * "London" on the pt pages, "东京" not "Tokyo" on zh-CN. See PLAN notes /
 * task brief for the full rationale.
 *
 * Two different strategies, deliberately:
 * - Countries: `Intl.DisplayNames` (`type: "region"`) covers all 193
 *   countries x all 11 locales natively, with no manual data to maintain
 *   or get wrong. It's the standard tool for exactly this job.
 * - Cities: no such API exists (there's no "translate a place name" Intl
 *   primitive), so `src/data/cityNames.json` hand-curates a `{ [cityId]:
 *   { [locale]: name } }` table for a deliberately small, high-traffic
 *   subset of cities (the 10 reference cities used in every page's diff
 *   table, the flight hubs, the replacement pool, and the ~100 most
 *   populous cities in cities.json). Every other city — and every locale
 *   not listed for a covered city — falls back to the English
 *   `city.name`, which is itself the correct display form in many
 *   locales (e.g. "Paris" is "Paris" in pt/es/fr/de/it/en alike).
 */
import type { City } from "@/types/city";
import cityNamesData from "@/data/cityNames.json";

type CityNameMap = Record<string, Record<string, string>>;
const cityNames = cityNamesData as CityNameMap;

/** Returns `city`'s display name for `locale`, falling back to the
 * English canonical `city.name` if this city (or this locale for this
 * city) isn't in the curated table. Never throws, never returns undefined. */
export function getLocalizedCityName(city: City, locale: string): string {
  return cityNames[city.id]?.[locale] ?? city.name;
}

/** All locale-tagged names for a city that are worth matching against in
 * search — the curated translations plus (unchanged) `cities.json`
 * aliases. Used by `searchCities` so e.g. typing "Londres" while browsing
 * the pt locale finds London. Does not include the canonical `city.name`
 * itself; callers already match against that separately. */
export function getSearchableLocalizedNames(city: City): string[] {
  const entry = cityNames[city.id];
  return entry ? Object.values(entry) : [];
}

const regionDisplayNamesCache = new Map<string, Intl.DisplayNames | null>();

function getRegionDisplayNames(locale: string): Intl.DisplayNames | null {
  const cached = regionDisplayNamesCache.get(locale);
  if (cached !== undefined) return cached;
  let instance: Intl.DisplayNames | null;
  try {
    instance = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    instance = null;
  }
  regionDisplayNamesCache.set(locale, instance);
  return instance;
}

/** Returns the localized country name for `countryCode` (ISO 3166-1
 * alpha-2) via `Intl.DisplayNames`, falling back to `fallback` (normally
 * the city's own `country` field, already an English name) if the
 * runtime's ICU data can't resolve it for this locale/code. */
export function getLocalizedCountryName(
  countryCode: string,
  locale: string,
  fallback: string,
): string {
  const displayNames = getRegionDisplayNames(locale);
  if (!displayNames) return fallback;
  try {
    return displayNames.of(countryCode) ?? fallback;
  } catch {
    return fallback;
  }
}
