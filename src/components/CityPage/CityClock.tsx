"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { useLocale } from "next-intl";
import { useSettingsStore, resolveHourFormat } from "@/stores/settingsStore";
import { toLuxonLocale, formatLocalizedDate } from "@/lib/timezone";

interface CityClockProps {
  timezone: string;
  /** UTC ISO instant computed server-side (build/ISR time), used for the
   * very first render so SSR markup and the pre-hydration client render
   * match exactly (no hydration mismatch). The mount effect below
   * immediately swaps this out for the real current time and starts
   * ticking every second — the "live" part of the live clock. */
  initialIso: string;
}

/**
 * Ticking H1 clock for a /time/[city] page: shows the exact local time
 * (down to the second) and full localized date for the city's timezone.
 * Client-only by necessity (a server-rendered clock would be stale the
 * instant it's cached by ISR) — see `initialIso` above for how the
 * server/client handoff avoids a hydration warning.
 */
export default function CityClock({ timezone, initialIso }: CityClockProps) {
  const locale = useLocale();
  const storedHourFormat = useSettingsStore((s) => s.hourFormat);
  const hourFormat = resolveHourFormat(storedHourFormat, locale);
  const luxonLocale = toLuxonLocale(locale);

  const [now, setNow] = useState<DateTime>(() => {
    const parsed = DateTime.fromISO(initialIso, { zone: "utc" });
    return parsed.isValid ? parsed : DateTime.utc();
  });

  useEffect(() => {
    setNow(DateTime.now());
    const id = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const zoned = now.setZone(timezone).setLocale(luxonLocale);
  const timeStr = zoned.isValid
    ? zoned.toFormat(hourFormat === "24" ? "HH:mm:ss" : "h:mm:ss a")
    : "--:--:--";
  const dateStr = zoned.isValid
    ? formatLocalizedDate(
        zoned,
        { weekday: "long", day: "numeric", month: "long", year: "numeric" },
        "cccc, d MMMM yyyy",
      )
    : "";

  return (
    <div>
      <p
        className="font-mono text-4xl font-bold tabular-nums sm:text-5xl"
        aria-live="off"
      >
        {timeStr}
      </p>
      <p className="mt-1 text-sm text-foreground/60 sm:text-base">{dateStr}</p>
    </div>
  );
}
