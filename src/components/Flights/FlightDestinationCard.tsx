"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { getFlagEmoji } from "@/lib/flags";
import { getLocalizedCityName, getLocalizedCountryName } from "@/lib/i18nNames";
import {
  estimateFlightOptions,
  type DateOption,
  type FlightOptionEstimate,
  type FlightOptionKind,
} from "@/lib/flightEstimate";
import type { City } from "@/types/city";

interface FlightDestinationCardProps {
  origin: City;
  destination: City;
  distanceKm: number;
  dateOption: DateOption;
  locale: string;
}

const KIND_BADGE_KEY: Record<FlightOptionKind, string> = {
  fastest: "optionFastest",
  cheapest: "optionCheapest",
  balanced: "optionBalanced",
};

const KIND_BADGE_CLASS: Record<FlightOptionKind, string> = {
  fastest: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  cheapest: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  balanced: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

function formatDuration(minutes: number, t: ReturnType<typeof useTranslations>) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return t("durationValue", { hours, minutes: mins });
}

function formatPriceRange(minUsd: number, maxUsd: number, locale: string) {
  const fmt = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return `${fmt.format(minUsd)} – ${fmt.format(maxUsd)}`;
}

function OptionRow({
  option,
  locale,
  t,
}: {
  option: FlightOptionEstimate;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const connectionsLabel =
    option.connections === 0
      ? t("direct")
      : option.connections === 1
        ? t("oneStop")
        : t("stopsCount", { count: option.connections });

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${KIND_BADGE_CLASS[option.kind]}`}
        >
          {t(KIND_BADGE_KEY[option.kind])}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatPriceRange(option.priceMinUsd, option.priceMaxUsd, locale)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-foreground/60">
        <span>{formatDuration(option.durationMinutes, t)}</span>
        <span>{connectionsLabel}</span>
      </div>
    </div>
  );
}

/**
 * One destination's flight-estimate card: flag/name header, great-circle
 * distance, and 2-3 simulated fare options (fastest/balanced/cheapest)
 * from src/lib/flightEstimate.ts. Recomputes whenever the origin or
 * departure-date chip changes.
 */
export default function FlightDestinationCard({
  origin,
  destination,
  distanceKm,
  dateOption,
  locale,
}: FlightDestinationCardProps) {
  const t = useTranslations("Flights");

  const options = useMemo(
    () => estimateFlightOptions(distanceKm, dateOption),
    [distanceKm, dateOption],
  );

  const distanceLabel = new Intl.NumberFormat(locale).format(Math.round(distanceKm));
  const destinationName = getLocalizedCityName(destination, locale);
  const destinationCountry = getLocalizedCountryName(destination.countryCode, locale, destination.country);
  const originName = getLocalizedCityName(origin, locale);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="text-xl">
            {getFlagEmoji(destination.countryCode)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{destinationName}</p>
            <p className="truncate text-xs text-foreground/50">{destinationCountry}</p>
          </div>
        </div>
        <p className="shrink-0 text-xs text-foreground/50">
          {t("distanceKm", { km: distanceLabel })}
        </p>
      </header>

      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <OptionRow key={option.kind} option={option} locale={locale} t={t} />
        ))}
      </div>

      <p className="sr-only">
        {t("fromTo", { origin: originName, destination: destinationName })}
      </p>
    </article>
  );
}
