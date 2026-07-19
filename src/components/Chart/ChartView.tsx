"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useSettingsStore, resolveHourFormat } from "@/stores/settingsStore";
import { getRowAnchor } from "@/lib/timezone";
import EmptyCitiesInvite from "@/components/Placeholders/EmptyCitiesInvite";
import HourDifferenceBars from "./HourDifferenceBars";
import OverlapChart from "./OverlapChart";

interface ChartViewProps {
  /** Hides the page-level h1/subtitle when embedded on the home dashboard,
   * which already shows a SectionHeader above this view. Defaults to false
   * so the dedicated /chart page is unchanged. */
  embedded?: boolean;
}

/**
 * Chart View (/chart): hour-difference bars + 24h business-hours overlap,
 * both driven by the shared comparatorStore cities. The reference city
 * (used as the "0" baseline) defaults to the first city in the grid, with a
 * dropdown here to change it — page-local only, not persisted.
 */
export default function ChartView({ embedded = false }: ChartViewProps) {
  const locale = useLocale();
  const t = useTranslations("Chart");
  const cities = useComparatorStore((s) => s.cities);
  const storedHourFormat = useSettingsStore((s) => s.hourFormat);
  const hourFormat = resolveHourFormat(storedHourFormat, locale);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );

  const [referenceCityId, setReferenceCityId] = useState<string | null>(null);
  const [now, setNow] = useState(() => DateTime.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(DateTime.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Default (and re-anchor if the chosen reference city gets removed).
  useEffect(() => {
    if (sortedCities.length === 0) {
      if (referenceCityId !== null) setReferenceCityId(null);
      return;
    }
    if (!sortedCities.some((c) => c.city.id === referenceCityId)) {
      setReferenceCityId(sortedCities[0].city.id);
    }
  }, [sortedCities, referenceCityId]);

  const anchor = useMemo(() => getRowAnchor(null, 3), [now]);

  const referenceCity =
    sortedCities.find((c) => c.city.id === referenceCityId) ?? sortedCities[0] ?? null;

  return (
    <div
      className={`mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 sm:px-6 ${
        embedded ? "" : "pb-24 pt-6"
      }`}
    >
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t("pageTitle")}</h1>
          <p className="text-sm text-foreground/60">{t("pageSubtitle")}</p>
        </div>
      )}

      {!referenceCity ? (
        <EmptyCitiesInvite />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="chart-reference-city" className="text-sm font-medium text-foreground/70">
              {t("referenceLabel")}
            </label>
            <select
              id="chart-reference-city"
              value={referenceCity.city.id}
              onChange={(e) => setReferenceCityId(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            >
              {sortedCities.map((c) => (
                <option key={c.city.id} value={c.city.id}>
                  {c.city.name}
                </option>
              ))}
            </select>
          </div>

          <HourDifferenceBars
            referenceCity={referenceCity}
            otherCities={sortedCities.filter((c) => c.city.id !== referenceCity.city.id)}
            now={now}
            hourFormat={hourFormat}
          />

          <OverlapChart
            cities={sortedCities}
            referenceCity={referenceCity}
            anchor={anchor}
            hourFormat={hourFormat}
            locale={locale}
          />
        </>
      )}
    </div>
  );
}
