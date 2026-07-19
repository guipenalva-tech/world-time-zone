"use client";

import { DateTime } from "luxon";
import { useTranslations } from "next-intl";
import type { ComparedCity } from "@/types/city";
import type { HourFormat } from "@/stores/settingsStore";
import { getHourRow } from "@/lib/timezone";
import { getFlagEmoji } from "@/lib/flags";
import { getLocalizedCityName } from "@/lib/i18nNames";
import { findCommonBusinessWindow, formatWindowRange } from "@/lib/chartCalc";

interface OverlapChartProps {
  cities: ComparedCity[];
  referenceCity: ComparedCity;
  anchor: DateTime;
  hourFormat: HourFormat;
  locale: string;
}

/**
 * One 24h row per city (slots share the same absolute instant per column,
 * per getHourRow/getRowAnchor — the same mechanism the home grid uses).
 * Local business hours (9am-6pm) are highlighted per row; the longest
 * contiguous run of columns where *every* city is in business hours at once
 * is outlined as the common meeting window.
 */
export default function OverlapChart({
  cities,
  referenceCity,
  anchor,
  hourFormat,
  locale,
}: OverlapChartProps) {
  const t = useTranslations("Chart");

  const rows = cities.map((c) => ({
    comparedCity: c,
    slots: getHourRow(c.city.timezone, anchor, 24, locale),
  }));

  const window = findCommonBusinessWindow(rows.map((r) => r.slots));
  const referenceSlots = getHourRow(referenceCity.city.timezone, anchor, 24, locale);
  const nowIndex = referenceSlots.findIndex((s) => s.isNow);
  const hourLabelFormat = hourFormat === "24" ? "HH:mm" : "h a";
  const referenceCityName = getLocalizedCityName(referenceCity.city, locale);

  return (
    <section aria-labelledby="overlap-heading">
      <h2 id="overlap-heading" className="mb-1 text-sm font-semibold text-foreground/80">
        {t("overlapTitle")}
      </h2>

      <p className="mb-3 text-xs font-medium text-foreground/70">
        {window
          ? t("bestWindow", {
              range: formatWindowRange(
                anchor,
                window,
                referenceCity.city.timezone,
                hourFormat,
              ),
              city: referenceCityName,
            })
          : t("noOverlap")}
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <div className="min-w-[720px]">
          {/* Hour axis, anchored to the reference city's local clock: a tick
              every 3h starting at midnight (0, 3, 6, 9, 12, 15, 18, 21). On
              narrow viewports only the 6h ticks (0, 6, 12, 18) are shown so
              labels never crowd or wrap. */}
          <div className="flex border-b border-border bg-surface/60 text-[10px] text-foreground/50">
            <div className="w-36 shrink-0 px-2 py-1.5 sm:w-44" aria-hidden="true" />
            <div className="flex flex-1">
              {referenceSlots.map((slot, i) => {
                const isMidnightOrNoon = slot.hour === 0 || slot.hour === 12;
                const isSixHourTick = slot.hour % 6 === 0;
                const isThreeHourTick = slot.hour % 3 === 0;

                return (
                  <div
                    key={slot.isoString}
                    className={`flex h-6 flex-1 items-center justify-start overflow-visible whitespace-nowrap border-l pl-0.5 ${
                      isMidnightOrNoon ? "border-border/70" : "border-border/40"
                    } ${i === nowIndex ? "font-semibold text-primary" : ""}`}
                  >
                    {isThreeHourTick && (
                      <span className={isSixHourTick ? "" : "hidden sm:inline"}>
                        {DateTime.fromISO(slot.isoString)
                          .setZone(referenceCity.city.timezone)
                          .toFormat(hourLabelFormat)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {rows.map(({ comparedCity, slots }) => (
            <div
              key={comparedCity.city.id}
              className="flex border-b border-border last:border-b-0"
            >
              <div className="flex w-36 shrink-0 items-center gap-1.5 px-2 py-2 text-xs font-medium sm:w-44">
                <span aria-hidden="true">{getFlagEmoji(comparedCity.city.countryCode)}</span>
                <span className="truncate">{getLocalizedCityName(comparedCity.city, locale)}</span>
                {comparedCity.city.id === referenceCity.city.id && (
                  <span className="shrink-0 text-[10px] font-normal text-foreground/40">
                    {t("referenceBadge")}
                  </span>
                )}
              </div>

              <div className="flex flex-1">
                {slots.map((slot, i) => {
                  const inWindow =
                    window !== null && i >= window.startIndex && i <= window.endIndex;
                  const referenceHour = referenceSlots[i]?.hour;
                  const isMidnightOrNoon = referenceHour === 0 || referenceHour === 12;
                  const cellLabel = `${getLocalizedCityName(comparedCity.city, locale)}: ${DateTime.fromISO(
                    slot.isoString,
                  )
                    .setZone(comparedCity.city.timezone)
                    .toFormat(hourFormat === "24" ? "HH:mm" : "h:mm a")} · ${
                    slot.isBusinessHour ? t("businessHour") : t("nonBusinessHour")
                  }`;

                  return (
                    <div
                      key={slot.isoString}
                      role="img"
                      aria-label={cellLabel}
                      title={cellLabel}
                      className={`h-7 flex-1 border-l ${
                        isMidnightOrNoon ? "border-border/70" : "border-border/40"
                      } ${
                        inWindow
                          ? "bg-success ring-1 ring-inset ring-success"
                          : slot.isBusinessHour
                            ? "bg-success/35"
                            : "bg-border/25"
                      } ${i === nowIndex ? "outline outline-1 -outline-offset-1 outline-primary" : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
