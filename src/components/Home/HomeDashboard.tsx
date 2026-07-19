"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import { groupCitiesByCountry } from "@/lib/newsGroups";
import {
  ClockIcon,
  MapIcon,
  ChartIcon,
  WeatherIcon,
  SunIcon,
  CurrencyIcon,
  FlightsIcon,
  NewsIcon,
  AlertsIcon,
} from "@/components/icons/NavIcons";
import Comparator from "@/components/Comparator/Comparator";
import MapView from "@/components/Map/MapView";
import ChartView from "@/components/Chart/ChartView";
import WeatherView from "@/components/Weather/WeatherView";
import SunView from "@/components/Sun/SunView";
import CurrencyView from "@/components/Currency/CurrencyView";
import FlightsView from "@/components/Flights/FlightsView";
import NewsView from "@/components/News/NewsView";
import AlertsView from "@/components/Alerts/AlertsView";
import JumpNav, { type JumpNavItem } from "./JumpNav";
import SectionHeader from "./SectionHeader";
import LazySection from "./LazySection";
import NewsCountryFilter from "./NewsCountryFilter";

const SECTION_ICON_CLASS = "h-4 w-4";

/**
 * Home dashboard: the comparator (eager, as before) followed by every other
 * feature view embedded in sequence, each behind its own SectionHeader and
 * lazily mounted as it nears the viewport (see LazySection) — the dedicated
 * /map, /chart, /weather, ... pages stay exactly as they were, for SEO and
 * for anyone who wants a single feature full-page.
 */
export default function HomeDashboard() {
  const t = useTranslations("HomeSections");
  const cities = useComparatorStore((s) => s.cities);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );

  const newsGroups = useMemo(() => groupCitiesByCountry(cities), [cities]);
  const [newsCountryFilter, setNewsCountryFilter] = useState<string | null>(null);

  // If the selected country's group disappears (its city was removed from
  // the comparator), fall back to "All" rather than showing a filter chip
  // that no longer exists.
  useEffect(() => {
    if (
      newsCountryFilter &&
      !newsGroups.some((g) => g.countryCode === newsCountryFilter)
    ) {
      setNewsCountryFilter(null);
    }
  }, [newsGroups, newsCountryFilter]);

  const jumpItems: JumpNavItem[] = [
    { id: "comparator", label: t("comparator"), icon: <ClockIcon className={SECTION_ICON_CLASS} /> },
    { id: "map", label: t("map"), icon: <MapIcon className={SECTION_ICON_CLASS} /> },
    { id: "chart", label: t("chart"), icon: <ChartIcon className={SECTION_ICON_CLASS} /> },
    { id: "weather", label: t("weather"), icon: <WeatherIcon className={SECTION_ICON_CLASS} /> },
    { id: "sun", label: t("sun"), icon: <SunIcon className={SECTION_ICON_CLASS} /> },
    { id: "currency", label: t("currency"), icon: <CurrencyIcon className={SECTION_ICON_CLASS} /> },
    { id: "flights", label: t("flights"), icon: <FlightsIcon className={SECTION_ICON_CLASS} /> },
    { id: "news", label: t("news"), icon: <NewsIcon className={SECTION_ICON_CLASS} /> },
    { id: "alerts", label: t("alerts"), icon: <AlertsIcon className={SECTION_ICON_CLASS} /> },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="pt-3">
        <JumpNav items={jumpItems} ariaLabel={t("jumpNavLabel")} />
      </div>

      <div id="comparator" className="scroll-mt-28">
        <Comparator />
      </div>

      <SectionHeader id="map" icon={<MapIcon className="h-5 w-5" />} title={t("map")} cities={sortedCities} />
      <LazySection minHeightClassName="min-h-[420px]">
        <MapView embedded />
      </LazySection>

      <SectionHeader id="chart" icon={<ChartIcon className="h-5 w-5" />} title={t("chart")} cities={sortedCities} />
      <LazySection minHeightClassName="min-h-[420px]">
        <ChartView embedded />
      </LazySection>

      <SectionHeader id="weather" icon={<WeatherIcon className="h-5 w-5" />} title={t("weather")} cities={sortedCities} />
      <LazySection minHeightClassName="min-h-[360px]">
        <WeatherView embedded />
      </LazySection>

      <SectionHeader id="sun" icon={<SunIcon className="h-5 w-5" />} title={t("sun")} cities={sortedCities} />
      <LazySection minHeightClassName="min-h-[360px]">
        <SunView embedded />
      </LazySection>

      <SectionHeader id="currency" icon={<CurrencyIcon className="h-5 w-5" />} title={t("currency")} cities={sortedCities} />
      <LazySection minHeightClassName="min-h-[420px]">
        <CurrencyView embedded />
      </LazySection>

      <SectionHeader id="flights" icon={<FlightsIcon className="h-5 w-5" />} title={t("flights")} cities={sortedCities} />
      <LazySection minHeightClassName="min-h-[420px]">
        <FlightsView embedded />
      </LazySection>

      <SectionHeader id="news" icon={<NewsIcon className="h-5 w-5" />} title={t("news")} cities={sortedCities} />
      <div className="pt-3">
        <NewsCountryFilter
          groups={newsGroups}
          value={newsCountryFilter}
          onChange={setNewsCountryFilter}
          allLabel={t("allCountries")}
        />
      </div>
      <LazySection minHeightClassName="min-h-[420px]">
        <NewsView embedded countryFilter={newsCountryFilter} />
      </LazySection>

      <SectionHeader id="alerts" icon={<AlertsIcon className="h-5 w-5" />} title={t("alerts")} cities={sortedCities} />
      <LazySection minHeightClassName="min-h-[320px]">
        <AlertsView embedded />
      </LazySection>
    </div>
  );
}
