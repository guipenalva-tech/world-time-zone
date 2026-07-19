"use client";

import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import type { ComparedCity } from "@/types/city";
import type { HourFormat } from "@/stores/settingsStore";
import { getFlagEmoji } from "@/lib/flags";
import { getLocalizedCityName } from "@/lib/i18nNames";
import { computeHourDiff, formatHourDiff } from "@/lib/chartCalc";

interface HourDifferenceBarsProps {
  referenceCity: ComparedCity;
  otherCities: ComparedCity[];
  now: DateTime;
  hourFormat: HourFormat;
}

/**
 * Horizontal bar per (non-reference) city: signed hour difference vs. the
 * reference city, bar length proportional to the largest difference in the
 * set, colored by sign (ahead / behind / same). Plain divs, no chart lib.
 */
export default function HourDifferenceBars({
  referenceCity,
  otherCities,
  now,
  hourFormat,
}: HourDifferenceBarsProps) {
  const t = useTranslations("Chart");
  const locale = useLocale();
  const timeFormat = hourFormat === "24" ? "HH:mm" : "h:mm a";

  const diffs = otherCities.map((c) => ({
    comparedCity: c,
    diffHours: computeHourDiff(c.city.timezone, referenceCity.city.timezone, now),
  }));
  const maxAbs = Math.max(1, ...diffs.map((d) => Math.abs(d.diffHours)));

  const refLocal = now.setZone(referenceCity.city.timezone);
  const referenceCityName = getLocalizedCityName(referenceCity.city, locale);

  return (
    <section aria-labelledby="hour-diff-heading">
      <h2 id="hour-diff-heading" className="mb-1 text-sm font-semibold text-foreground/80">
        {t("hourDiffTitle")}
      </h2>
      <p className="mb-3 text-xs text-foreground/50">
        {t("hourDiffSubtitle", { city: referenceCityName })}
      </p>

      <div className="rounded-xl border border-border bg-surface/40 p-4">
        <div className="mb-3 flex items-center gap-2 border-b border-border pb-3 text-sm">
          <span aria-hidden="true" className="text-lg">
            {getFlagEmoji(referenceCity.city.countryCode)}
          </span>
          <span className="font-semibold">{referenceCityName}</span>
          <span className="text-foreground/50">{t("referenceBadge")}</span>
          <span className="ml-auto font-mono tabular-nums text-foreground/70">
            {refLocal.toFormat(timeFormat)}
          </span>
        </div>

        {diffs.length === 0 ? (
          <p className="py-4 text-center text-sm text-foreground/50">
            {t("needMoreCities")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {diffs.map(({ comparedCity, diffHours }) => {
              const { city } = comparedCity;
              const cityName = getLocalizedCityName(city, locale);
              const localTime = now.setZone(city.timezone).toFormat(timeFormat);
              const isAhead = diffHours > 0.01;
              const isBehind = diffHours < -0.01;
              const widthPct = Math.max(
                4,
                Math.round((Math.abs(diffHours) / maxAbs) * 100),
              );
              const barColor = isAhead
                ? "bg-primary"
                : isBehind
                  ? "bg-warning"
                  : "bg-border";
              const label = isAhead || isBehind
                ? formatHourDiff(diffHours)
                : t("sameTime");

              return (
                <li key={city.id} className="flex items-center gap-3">
                  <div className="flex w-36 shrink-0 items-center gap-1.5 sm:w-44">
                    <span aria-hidden="true">{getFlagEmoji(city.countryCode)}</span>
                    <span className="truncate text-sm font-medium">{cityName}</span>
                  </div>

                  <div
                    className="relative h-6 flex-1 rounded bg-border/30"
                    role="img"
                    aria-label={t("barAriaLabel", {
                      city: cityName,
                      diff: label,
                      time: localTime,
                    })}
                    title={`${cityName}: ${label}, ${localTime}`}
                  >
                    <div
                      className={`h-full rounded transition-[width] ${barColor}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  <div className="w-24 shrink-0 text-right sm:w-28">
                    <p className="text-sm font-semibold tabular-nums">{label}</p>
                    <p className="font-mono text-xs text-foreground/50">{localTime}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
