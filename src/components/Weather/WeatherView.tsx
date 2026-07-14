"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import EmptyCitiesInvite from "@/components/Placeholders/EmptyCitiesInvite";
import WeatherCard from "./WeatherCard";

/**
 * Weather View (/weather): a card per compared city with current
 * conditions and a 7-day forecast, sourced from Open-Meteo (no API key).
 * Each card fetches independently, so one city's network error never
 * blanks out the rest of the grid.
 */
export default function WeatherView() {
  const locale = useLocale();
  const t = useTranslations("Weather");
  const cities = useComparatorStore((s) => s.cities);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pb-24 pt-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("heading")}</h1>
        <p className="text-sm text-foreground/60">{t("subtitle")}</p>
      </div>

      {sortedCities.length === 0 ? (
        <EmptyCitiesInvite />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sortedCities.map((comparedCity) => (
            <WeatherCard key={comparedCity.city.id} comparedCity={comparedCity} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
