"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { findCityByTimezone, getCityById } from "@/lib/cities";
import { haversineDistanceKm, type DateOption } from "@/lib/flightEstimate";
import EmptyCitiesInvite from "@/components/Placeholders/EmptyCitiesInvite";
import AdBanner from "@/components/Ads/AdBanner";
import type { City } from "@/types/city";
import DisclaimerBanner from "./DisclaimerBanner";
import OriginPicker from "./OriginPicker";
import DateOptionPicker from "./DateOptionPicker";
import CurrencyPicker from "./CurrencyPicker";
import FlightDestinationCard from "./FlightDestinationCard";

/** Fallback city if timezone detection fails and no override is set,
 * matching LocationCard's own fallback. */
const FALLBACK_ORIGIN_ID = "london";

/**
 * Flight estimates view (/flights): distance-based, formula-derived
 * price/duration ranges from the trip origin (defaults to the detected/
 * LocationCard city, overridable here) to every city in the comparator.
 * There's no paid flights API behind this — see src/lib/flightEstimate.ts
 * for the estimation formulas and the very visible DisclaimerBanner below.
 */
interface FlightsViewProps {
  /** Hides the page-level h1/subtitle when embedded on the home dashboard,
   * which already shows a SectionHeader above this view. Defaults to false
   * so the dedicated /flights page is unchanged. */
  embedded?: boolean;
}

export default function FlightsView({ embedded = false }: FlightsViewProps) {
  const t = useTranslations("Flights");
  const locale = useLocale();
  const cities = useComparatorStore((s) => s.cities);
  const localCardCityId = useSettingsStore((s) => s.localCardCityId);

  const [detectedCity, setDetectedCity] = useState<City | null>(null);
  const [originOverride, setOriginOverride] = useState<City | null>(null);
  const [dateOption, setDateOption] = useState<DateOption>("in1Week");
  const [currency, setCurrency] = useState("USD");
  // Brief opacity fade whenever the date chip changes, so the recalculated
  // prices below don't just snap to new values.
  const [fadeIn, setFadeIn] = useState(true);

  // Detect the visitor's timezone once on mount (client-only), same
  // resolution order as LocationCard, so /flights defaults to the same
  // "your local time" city shown there.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetectedCity(findCityByTimezone(tz) ?? null);
    } catch {
      setDetectedCity(null);
    }
  }, []);

  const origin =
    originOverride ??
    (localCardCityId ? getCityById(localCardCityId) : null) ??
    detectedCity ??
    getCityById(FALLBACK_ORIGIN_ID) ??
    null;

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );

  const destinations = useMemo(
    () => sortedCities.filter((c) => c.city.id !== origin?.id),
    [sortedCities, origin],
  );

  useEffect(() => {
    setFadeIn(false);
    const id = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(id);
  }, [dateOption]);

  return (
    <div
      className={`mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 sm:px-6 ${
        embedded ? "" : "pb-24 pt-6"
      }`}
    >
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t("heading")}</h1>
          <p className="text-sm text-foreground/60">{t("subtitle")}</p>
        </div>
      )}

      {cities.length === 0 ? (
        <EmptyCitiesInvite />
      ) : (
        <>
          <DisclaimerBanner />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {origin && <OriginPicker origin={origin} onChange={setOriginOverride} />}
            <CurrencyPicker currency={currency} onChange={setCurrency} />
          </div>

          <DateOptionPicker value={dateOption} onChange={setDateOption} />

          {origin && destinations.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center text-sm text-foreground/50">
              {t("needMoreCities")}
            </p>
          )}

          {origin && destinations.length > 0 && (
            <div
              className={`grid grid-cols-1 gap-4 transition-opacity duration-300 sm:grid-cols-2 ${
                fadeIn ? "opacity-100" : "opacity-0"
              }`}
            >
              {destinations.map((comparedCity) => (
                <FlightDestinationCard
                  key={comparedCity.city.id}
                  origin={origin}
                  destination={comparedCity.city}
                  distanceKm={haversineDistanceKm(
                    origin.lat,
                    origin.lon,
                    comparedCity.city.lat,
                    comparedCity.city.lon,
                  )}
                  dateOption={dateOption}
                  locale={locale}
                  currency={currency}
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
