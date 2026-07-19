"use client";

import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { findCityByTimezone, getCityById } from "@/lib/cities";
import { formatLocalizedDate, getZoneInfo, toLuxonLocale } from "@/lib/timezone";
import { getFlagEmoji } from "@/lib/flags";
import { getLocalizedCityName, getLocalizedCountryName } from "@/lib/i18nNames";
import {
  useSettingsStore,
  resolveHourFormat,
} from "@/stores/settingsStore";
import type { City } from "@/types/city";
import CitySearch from "@/components/Search/CitySearch";

/** Fallback city if timezone detection fails and no override is stored. */
const FALLBACK_CITY_ID = "london";

/**
 * Prominent "your local time" card shown above the comparator grid, in the
 * style of 24timezones.com — a live-ticking clock for the detected (or
 * user-chosen) city, plus full date and zone metadata.
 */
export default function LocationCard() {
  const locale = useLocale();
  const t = useTranslations("LocationCard");
  const storedHourFormat = useSettingsStore((s) => s.hourFormat);
  const hourFormat = resolveHourFormat(storedHourFormat, locale);
  const localCardCityId = useSettingsStore((s) => s.localCardCityId);
  const setLocalCardCityId = useSettingsStore((s) => s.setLocalCardCityId);

  const [detectedCity, setDetectedCity] = useState<City | null>(null);
  const [now, setNow] = useState(() => DateTime.now());
  const [pickerOpen, setPickerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Detect the visitor's timezone once on mount (client-only).
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetectedCity(findCityByTimezone(tz) ?? null);
    } catch {
      setDetectedCity(null);
    }
  }, []);

  // Live ticking clock.
  useEffect(() => {
    const interval = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    function onPointerDownOutside(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDownOutside);
    };
  }, [pickerOpen]);

  const city =
    (localCardCityId ? getCityById(localCardCityId) : null) ??
    detectedCity ??
    getCityById(FALLBACK_CITY_ID) ??
    null;

  if (!city) return null;

  const luxonLocale = toLuxonLocale(locale);
  const zoned = now.setZone(city.timezone).setLocale(luxonLocale);
  const zoneInfo = getZoneInfo(city.timezone, now);
  const timeLabel = zoned.toFormat(hourFormat === "24" ? "HH:mm:ss" : "h:mm:ss a");
  const dateLabel = formatLocalizedDate(
    zoned,
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    "cccc, d MMMM yyyy",
  );

  function handlePick(picked: City) {
    setLocalCardCityId(picked.id);
    setPickerOpen(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-surface to-surface px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
          {t("title")}
        </p>

        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-2xl">
            {getFlagEmoji(city.countryCode)}
          </span>
          <div className="text-left">
            <p className="text-lg font-semibold leading-tight">
              {getLocalizedCityName(city, locale)}
            </p>
            <p className="text-xs text-foreground/50">
              {getLocalizedCountryName(city.countryCode, locale, city.country)}
            </p>
          </div>
        </div>

        <p className="font-mono text-4xl font-bold tabular-nums tracking-tight sm:text-6xl">
          {timeLabel}
        </p>

        <p className="text-sm text-foreground/70 sm:text-base">{dateLabel}</p>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-foreground/50">
          <span>{city.timezone}</span>
          <span aria-hidden="true">·</span>
          <span>{zoneInfo.offsetFormatted}</span>
          {zoneInfo.isDST && (
            <>
              <span aria-hidden="true">·</span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                {t("dst")}
              </span>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-background hover:text-foreground"
          >
            {t("useAnotherCity")}
          </button>

          {pickerOpen && (
            <div
              ref={panelRef}
              role="dialog"
              aria-label={t("useAnotherCity")}
              className="absolute left-1/2 top-full z-40 mt-2 w-72 -translate-x-1/2 rounded-lg border border-border bg-background p-3 text-left shadow-xl"
            >
              <CitySearch onSelect={handlePick} autoFocus />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
