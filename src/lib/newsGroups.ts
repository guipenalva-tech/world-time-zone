import type { City, ComparedCity } from "@/types/city";

export interface CountryNewsGroup {
  countryCode: string;
  /** English country name (City.country), used both for display and as the /api/news query subject. */
  country: string;
  cities: City[];
  /** Lowest comparator `order` among the group's cities — keeps group order stable and matching the comparator. */
  order: number;
}

/**
 * Groups compared cities by country so the News view renders one section
 * per country instead of one per city — two cities in the same country
 * (e.g. New York + Chicago) share a single headline feed rather than
 * duplicating the request and the results.
 */
export function groupCitiesByCountry(cities: ComparedCity[]): CountryNewsGroup[] {
  const groups = new Map<string, CountryNewsGroup>();

  for (const { city, order } of [...cities].sort((a, b) => a.order - b.order)) {
    const existing = groups.get(city.countryCode);
    if (existing) {
      existing.cities.push(city);
    } else {
      groups.set(city.countryCode, {
        countryCode: city.countryCode,
        country: city.country,
        cities: [city],
        order,
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.order - b.order);
}
