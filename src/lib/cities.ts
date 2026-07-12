import type { City } from "@/types/city";
import citiesData from "@/data/cities.json";

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
 * Search cities by name, country, or alias. Case/accent-insensitive.
 * Ranks prefix matches above substring matches, then by population.
 * Returns at most `limit` results (default 8).
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

    let score: number | null = null;

    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (aliases.some((a) => a.startsWith(q))) score = 2;
    else if (country.startsWith(q)) score = 3;
    else if (name.includes(q)) score = 4;
    else if (aliases.some((a) => a.includes(q))) score = 5;
    else if (country.includes(q)) score = 6;

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
