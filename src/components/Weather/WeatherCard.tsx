"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { useTranslations } from "next-intl";
import type { ComparedCity } from "@/types/city";
import { getFlagEmoji } from "@/lib/flags";
import { toLuxonLocale } from "@/lib/timezone";
import { fetchWeather, weatherCodeToInfo, type WeatherData } from "@/lib/weather";
import { WeatherCategoryIcon } from "./icons";

interface WeatherCardProps {
  comparedCity: ComparedCity;
  locale: string;
}

type CardState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; data: WeatherData };

/**
 * One city's weather card: fetches its own data independently of every
 * other card (own effect, own state, own retry button), so a failure for
 * one city never blocks or blanks out the rest of the grid.
 */
export default function WeatherCard({ comparedCity, locale }: WeatherCardProps) {
  const t = useTranslations("Weather");
  const { city } = comparedCity;
  const luxonLocale = toLuxonLocale(locale);

  const [state, setState] = useState<CardState>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetchWeather(city.lat, city.lon)
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [city.lat, city.lon, retryToken]);

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-surface/40 p-4">
      <header className="flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">
          {getFlagEmoji(city.countryCode)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{city.name}</p>
          <p className="truncate text-xs text-foreground/50">{city.country}</p>
        </div>
      </header>

      {state.status === "loading" && <WeatherCardSkeleton />}

      {state.status === "error" && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-danger/40 bg-danger/5 px-3 py-8 text-center">
          <p className="text-sm text-danger">{t("errorText")}</p>
          <button
            type="button"
            onClick={() => setRetryToken((n) => n + 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:border-primary hover:text-primary"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {state.status === "success" && (
        <WeatherCardContent data={state.data} luxonLocale={luxonLocale} />
      )}
    </article>
  );
}

function WeatherCardContent({
  data,
  luxonLocale,
}: {
  data: WeatherData;
  luxonLocale: string;
}) {
  const t = useTranslations("Weather");
  const info = weatherCodeToInfo(data.current.weatherCode);

  return (
    <>
      <div className="flex items-center gap-3">
        <WeatherCategoryIcon
          category={info.category}
          className="h-10 w-10 shrink-0 text-foreground/80"
        />
        <div className="min-w-0">
          <p className="text-3xl font-semibold tabular-nums">
            {Math.round(data.current.temperature)}°C
          </p>
          <p className="truncate text-xs text-foreground/60">
            {t(`conditions.${info.labelKey}`)}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-x-2 gap-y-2 text-xs">
        <div>
          <dt className="text-foreground/50">{t("feelsLike")}</dt>
          <dd className="font-medium tabular-nums">
            {Math.round(data.current.apparentTemperature)}°C
          </dd>
        </div>
        <div>
          <dt className="text-foreground/50">{t("humidity")}</dt>
          <dd className="font-medium tabular-nums">{Math.round(data.current.humidity)}%</dd>
        </div>
        <div>
          <dt className="text-foreground/50">{t("wind")}</dt>
          <dd className="font-medium tabular-nums">{Math.round(data.current.windSpeed)} km/h</dd>
        </div>
      </dl>

      <div className="border-t border-border pt-3">
        <p className="mb-1.5 text-xs font-semibold text-foreground/60">{t("forecast7Day")}</p>
        <div className="flex flex-col gap-1">
          {data.daily.map((day) => {
            const dayInfo = weatherCodeToInfo(day.weatherCode);
            const dayDate = DateTime.fromISO(day.date).setLocale(luxonLocale);
            return (
              <div key={day.date} className="flex items-center gap-2 text-sm">
                <span className="w-9 shrink-0 truncate text-foreground/70">
                  {dayDate.isValid ? dayDate.toFormat("ccc") : "—"}
                </span>
                <WeatherCategoryIcon
                  category={dayInfo.category}
                  className="h-5 w-5 shrink-0 text-foreground/60"
                />
                <span className="ml-auto flex items-center gap-1.5 tabular-nums">
                  <span className="text-foreground/50">{Math.round(day.tempMin)}°</span>
                  <span className="font-medium">{Math.round(day.tempMax)}°</span>
                </span>
                <span className="w-9 shrink-0 text-right text-xs text-foreground/50 tabular-nums">
                  {day.precipitationProbability != null
                    ? `${Math.round(day.precipitationProbability)}%`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function WeatherCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-foreground/10" />
        <div className="flex flex-col gap-1.5">
          <div className="h-7 w-16 rounded bg-foreground/10" />
          <div className="h-3 w-24 rounded bg-foreground/10" />
        </div>
      </div>
      <div className="h-10 rounded bg-foreground/5" />
      <div className="h-36 rounded bg-foreground/5" />
    </div>
  );
}
