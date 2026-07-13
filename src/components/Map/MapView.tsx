"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useSettingsStore, resolveHourFormat } from "@/stores/settingsStore";
import EmptyCitiesInvite from "@/components/Placeholders/EmptyCitiesInvite";
import WorldMapBase from "./WorldMapBase";
import NightOverlay from "./NightOverlay";
import CityMarkers from "./CityMarkers";
import MapLegend from "./MapLegend";
import { WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT } from "./projection";

/**
 * Map View (/map): a world map with a live day/night terminator and pins
 * for every city in the shared comparatorStore. Everything (terminator,
 * subsolar point, marker local times) recomputes once a minute from a
 * single `now` tick, so it all stays in sync.
 */
export default function MapView() {
  const locale = useLocale();
  const t = useTranslations("Map");
  const cities = useComparatorStore((s) => s.cities);
  const storedHourFormat = useSettingsStore((s) => s.hourFormat);
  const hourFormat = resolveHourFormat(storedHourFormat, locale);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );
  const referenceCityId = sortedCities[0]?.city.id ?? null;

  const [now, setNow] = useState(() => DateTime.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(DateTime.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pb-24 pt-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("pageTitle")}</h1>
        <p className="text-sm text-foreground/60">{t("pageSubtitle")}</p>
      </div>

      {sortedCities.length === 0 ? (
        <EmptyCitiesInvite />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-surface/40">
            <svg
              viewBox={`0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`}
              className="w-full h-auto"
              role="img"
              aria-label={t("pageTitle")}
            >
              <WorldMapBase />
              <NightOverlay now={now.toJSDate()} subsolarLabel={t("legendSubsolar")} />
              <CityMarkers
                cities={sortedCities}
                referenceCityId={referenceCityId}
                now={now}
                hourFormat={hourFormat}
                tooltipFormatter={(country, offset) => t("tooltip", { country, offset })}
                ariaLabelFormatter={(city, time, offset) =>
                  t("markerAriaLabel", { city, time, offset })
                }
              />
            </svg>
          </div>

          <MapLegend now={now} />
        </>
      )}
    </div>
  );
}
