"use client";

import { useMemo } from "react";
import { DateTime } from "luxon";
import { useTranslations } from "next-intl";
import type { ComparedCity } from "@/types/city";
import type { HourFormat } from "@/stores/settingsStore";
import { getFlagEmoji } from "@/lib/flags";
import { getLocalizedCityName } from "@/lib/i18nNames";
import { formatLocalizedDate, toLuxonLocale } from "@/lib/timezone";
import { getSunTimes, type MoonPhase, type MoonPhaseName, type TwilightBand } from "@/lib/sun";
import { MoonIcon } from "@/components/icons/SunMoonIcons";
import { SunriseIcon, SunsetIcon } from "./icons";
import DayArc from "./DayArc";

interface SunCardProps {
  comparedCity: ComparedCity;
  now: DateTime;
  hourFormat: HourFormat;
  locale: string;
  moonPhase: MoonPhase;
  showGoldenHour: boolean;
  showTwilight: boolean;
  showMoonPhase: boolean;
}

const NOT_AVAILABLE = "—";

export default function SunCard({
  comparedCity,
  now,
  hourFormat,
  locale,
  moonPhase,
  showGoldenHour,
  showTwilight,
  showMoonPhase,
}: SunCardProps) {
  const t = useTranslations("Sun");
  const { city } = comparedCity;
  const luxonLocale = toLuxonLocale(locale);
  const timeFormat = hourFormat === "24" ? "HH:mm" : "h:mm a";

  const cityNow = now.setZone(city.timezone).setLocale(luxonLocale);
  const dateISO = cityNow.toISODate() ?? cityNow.toFormat("yyyy-LL-dd");

  const sunTimes = useMemo(
    () => getSunTimes(city.lat, city.lon, dateISO, city.timezone),
    [city.lat, city.lon, city.timezone, dateISO],
  );

  const fmt = (dt: DateTime | null) => (dt ? dt.setZone(city.timezone).toFormat(timeFormat) : NOT_AVAILABLE);
  const range = (start: DateTime | null, end: DateTime | null) =>
    start && end ? `${fmt(start)} – ${fmt(end)}` : NOT_AVAILABLE;

  const dayLengthHours = Math.floor(sunTimes.dayLengthMinutes / 60);
  const dayLengthMinutes = Math.round(sunTimes.dayLengthMinutes % 60);

  const twilightRows: { key: string; band: TwilightBand }[] = [
    { key: "civilTwilight", band: sunTimes.civil },
    { key: "nauticalTwilight", band: sunTimes.nautical },
    { key: "astronomicalTwilight", band: sunTimes.astronomical },
  ];

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-surface/40 p-4">
      <header className="flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">
          {getFlagEmoji(city.countryCode)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{getLocalizedCityName(city, locale)}</p>
          <p className="truncate text-xs text-foreground/50">
            {formatLocalizedDate(
              cityNow,
              { weekday: "long", day: "numeric", month: "long" },
              "cccc, d MMMM",
            )}
          </p>
        </div>
      </header>

      <DayArc
        sunTimes={sunTimes}
        now={cityNow}
        lat={city.lat}
        hourFormat={hourFormat}
        showGoldenHour={showGoldenHour}
        showTwilight={showTwilight}
      />

      {sunTimes.daylightState !== "normal" ? (
        <p className="text-center text-sm font-medium text-foreground/70">
          {sunTimes.daylightState === "alwaysAbove" ? t("sunNeverSets") : t("sunNeverRises")}
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div>
            <dt className="flex items-center gap-1 text-xs text-foreground/50">
              <SunriseIcon className="h-4 w-4" />
              {t("sunrise")}
            </dt>
            <dd className="font-mono font-medium tabular-nums">{fmt(sunTimes.sunrise)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs text-foreground/50">
              <SunsetIcon className="h-4 w-4" />
              {t("sunset")}
            </dt>
            <dd className="font-mono font-medium tabular-nums">{fmt(sunTimes.sunset)}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground/50">{t("dayLength")}</dt>
            <dd className="font-medium tabular-nums">
              {t("dayLengthValue", { hours: dayLengthHours, minutes: dayLengthMinutes })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-foreground/50">{t("solarNoon")}</dt>
            <dd className="font-mono font-medium tabular-nums">{fmt(sunTimes.solarNoon)}</dd>
          </div>
        </dl>
      )}

      {showGoldenHour && (
        <div className="border-t border-border pt-3 text-sm">
          <p className="mb-1.5 text-xs font-semibold text-foreground/60">{t("filterGoldenHour")}</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground/60">{t("goldenHourMorning")}</span>
              <span className="font-mono tabular-nums">
                {range(sunTimes.goldenHourMorning.start, sunTimes.goldenHourMorning.end)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground/60">{t("goldenHourEvening")}</span>
              <span className="font-mono tabular-nums">
                {range(sunTimes.goldenHourEvening.start, sunTimes.goldenHourEvening.end)}
              </span>
            </div>
          </div>
        </div>
      )}

      {showTwilight && (
        <div className="border-t border-border pt-3 text-sm">
          <p className="mb-1.5 text-xs font-semibold text-foreground/60">{t("filterTwilight")}</p>
          <div className="flex flex-col gap-1">
            {twilightRows.map(({ key, band: b }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-foreground/60">{t(key)}</span>
                <span className="font-mono tabular-nums">
                  {b.state === "normal" ? (
                    <>
                      {fmt(b.dawn)} / {fmt(b.dusk)}
                    </>
                  ) : (
                    NOT_AVAILABLE
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showMoonPhase && (
        <div className="border-t border-border pt-3 text-sm">
          <p className="mb-1.5 text-xs font-semibold text-foreground/60">{t("moonPhase")}</p>
          <div className="flex items-center gap-3">
            <MoonIcon className="h-6 w-6 shrink-0 text-foreground/70" />
            <div className="min-w-0">
              <p className="font-medium">{t(`moonPhaseNames.${moonPhase.phase}` as `moonPhaseNames.${MoonPhaseName}`)}</p>
              <p className="text-xs text-foreground/50">
                {t("illuminated", { percent: Math.round(moonPhase.illuminatedFraction * 100) })}
              </p>
              <p className="text-xs text-foreground/50">
                {t("nextFullMoon", {
                  date: formatLocalizedDate(
                    DateTime.fromISO(moonPhase.nextFullMoon, { zone: "utc" }).setLocale(luxonLocale),
                    { day: "numeric", month: "short" },
                    "d MMM",
                  ),
                })}
                {" · "}
                {t("nextNewMoon", {
                  date: formatLocalizedDate(
                    DateTime.fromISO(moonPhase.nextNewMoon, { zone: "utc" }).setLocale(luxonLocale),
                    { day: "numeric", month: "short" },
                    "d MMM",
                  ),
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
