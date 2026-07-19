"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useSettingsStore, resolveHourFormat } from "@/stores/settingsStore";
import { getMoonPhase } from "@/lib/sun";
import EmptyCitiesInvite from "@/components/Placeholders/EmptyCitiesInvite";
import AdBanner from "@/components/Ads/AdBanner";
import SunFilters from "./SunFilters";
import SunCard from "./SunCard";

/**
 * Sunrise & Sunset view (/sun): a card per compared city with sunrise,
 * sunset, day length, and solar noon, plus optional golden-hour, twilight,
 * and moon-phase sections toggled by the filters above the grid. Recomputes
 * once a minute from a single `now` tick (mirrors Chart/Map View), and the
 * moon phase is computed once here and shared across every card so it's
 * globally coherent regardless of each city's own local calendar date.
 */
interface SunViewProps {
  /** Hides the page-level h1/subtitle when embedded on the home dashboard,
   * which already shows a SectionHeader above this view. Defaults to false
   * so the dedicated /sun page is unchanged. */
  embedded?: boolean;
}

export default function SunView({ embedded = false }: SunViewProps) {
  const locale = useLocale();
  const t = useTranslations("Sun");
  const cities = useComparatorStore((s) => s.cities);
  const storedHourFormat = useSettingsStore((s) => s.hourFormat);
  const hourFormat = resolveHourFormat(storedHourFormat, locale);
  const showGoldenHour = useSettingsStore((s) => s.sunShowGoldenHour);
  const showTwilight = useSettingsStore((s) => s.sunShowTwilight);
  const showMoonPhase = useSettingsStore((s) => s.sunShowMoonPhase);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );

  // Deferred to an effect (not a useState initializer) for the same reason
  // as Map View: keeps the server/first-client-render markup identical so
  // React doesn't flag a hydration mismatch over sub-minute timing.
  const [now, setNow] = useState<DateTime | null>(null);

  useEffect(() => {
    setNow(DateTime.now());
    const interval = setInterval(() => setNow(DateTime.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const moonPhase = useMemo(
    () => (now ? getMoonPhase(now.toISODate() ?? now.toFormat("yyyy-LL-dd")) : null),
    [now],
  );

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
          <SunFilters />

          {now && moonPhase && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sortedCities.map((comparedCity) => (
                <SunCard
                  key={comparedCity.city.id}
                  comparedCity={comparedCity}
                  now={now}
                  hourFormat={hourFormat}
                  locale={locale}
                  moonPhase={moonPhase}
                  showGoldenHour={showGoldenHour}
                  showTwilight={showTwilight}
                  showMoonPhase={showMoonPhase}
                />
              ))}
            </div>
          )}
        </>
      )}

      {!embedded && <AdBanner slot="infeed" />}
    </div>
  );
}
