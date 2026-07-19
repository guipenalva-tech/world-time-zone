"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useSettingsStore, resolveHourFormat } from "@/stores/settingsStore";
import EmptyCitiesInvite from "@/components/Placeholders/EmptyCitiesInvite";
import AdBanner from "@/components/Ads/AdBanner";
import WorldMapBase from "./WorldMapBase";
import NightOverlay from "./NightOverlay";
import CityMarkers from "./CityMarkers";
import MapLegend from "./MapLegend";
import { WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT } from "./projection";

interface MapViewProps {
  /** Hides the page-level h1/subtitle when embedded on the home dashboard,
   * which already shows a SectionHeader above this view. Defaults to false
   * so the dedicated /map page is unchanged. */
  embedded?: boolean;
}

/**
 * Map View (/map): a world map with a live day/night terminator and pins
 * for every city in the shared comparatorStore. Everything (terminator,
 * subsolar point, marker local times) recomputes once a minute from a
 * single `now` tick, so it all stays in sync.
 */
export default function MapView({ embedded = false }: MapViewProps) {
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

  // `now` starts null and is only set client-side (in an effect) rather than
  // via a `useState(() => DateTime.now())` initializer: the terminator and
  // marker positions are precise enough that the few milliseconds between
  // server render and client hydration produce different sub-pixel values,
  // which React flags as a hydration mismatch. Deferring to an effect keeps
  // the server/first-client-render markup identical (nothing time-based
  // rendered yet), then fills in once mounted.
  const [now, setNow] = useState<DateTime | null>(null);

  useEffect(() => {
    setNow(DateTime.now());
    const interval = setInterval(() => setNow(DateTime.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 sm:px-6 ${
        embedded ? "" : "pb-24 pt-6"
      }`}
    >
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t("pageTitle")}</h1>
          <p className="text-sm text-foreground/60">{t("pageSubtitle")}</p>
        </div>
      )}

      {sortedCities.length === 0 ? (
        <EmptyCitiesInvite />
      ) : (
        <>
          <div
            className="relative w-full overflow-hidden rounded-xl border border-border bg-surface/40"
            style={{ aspectRatio: `${WORLD_MAP_WIDTH} / ${WORLD_MAP_HEIGHT}` }}
          >
            <svg
              viewBox={`0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`}
              className="absolute inset-0 h-full w-full"
              role="img"
              aria-label={t("pageTitle")}
            >
              <WorldMapBase />
              {now && <NightOverlay now={now.toJSDate()} subsolarLabel={t("legendSubsolar")} />}
            </svg>

            {now && (
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
            )}
          </div>

          {now && <MapLegend now={now} />}
        </>
      )}

      {!embedded && <AdBanner slot="infeed" />}
    </div>
  );
}
