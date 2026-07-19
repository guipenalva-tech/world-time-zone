"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import EmptyCitiesInvite from "@/components/Placeholders/EmptyCitiesInvite";
import { groupCitiesByCountry } from "@/lib/newsGroups";
import CountryNewsSection from "./CountryNewsSection";

/**
 * News view (/news): travel/safety-relevant headlines for the countries of
 * the compared cities, one section per country (grouped so two cities in
 * the same country don't fetch — or show — the same feed twice). Headlines
 * come from Google News RSS via the /api/news proxy (see that route's
 * docstring for why a proxy is needed).
 */
interface NewsViewProps {
  /** Hides the page-level h1/subtitle when embedded on the home dashboard,
   * which already shows a SectionHeader above this view. Defaults to false
   * so the dedicated /news page is unchanged. */
  embedded?: boolean;
  /** Narrows the sections shown to a single country (by ISO code), used by
   * the home dashboard's country filter chips. null/undefined shows every
   * compared country, same as the dedicated /news page. */
  countryFilter?: string | null;
}

export default function NewsView({ embedded = false, countryFilter = null }: NewsViewProps) {
  const locale = useLocale();
  const t = useTranslations("News");
  const cities = useComparatorStore((s) => s.cities);

  const groups = useMemo(() => groupCitiesByCountry(cities), [cities]);
  const visibleGroups = useMemo(
    () => (countryFilter ? groups.filter((g) => g.countryCode === countryFilter) : groups),
    [groups, countryFilter],
  );

  return (
    <div
      className={`mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 sm:px-6 ${
        embedded ? "" : "pb-24 pt-6"
      }`}
    >
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t("heading")}</h1>
          <p className="text-sm text-foreground/60">{t("subtitle")}</p>
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyCitiesInvite />
      ) : (
        <>
          <p className="rounded-lg border border-border bg-surface/40 px-3 py-2 text-xs text-foreground/50">
            {t("disclaimer")}
          </p>

          <div className="flex flex-col gap-6">
            {visibleGroups.map((group) => (
              <CountryNewsSection key={group.countryCode} group={group} locale={locale} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
