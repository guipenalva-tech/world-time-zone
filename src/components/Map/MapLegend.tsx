"use client";

import { DateTime } from "luxon";
import { useTranslations } from "next-intl";

interface MapLegendProps {
  now: DateTime;
}

/** Day/night swatch legend plus the current UTC time, both driving the map above. */
export default function MapLegend({ now }: MapLegendProps) {
  const t = useTranslations("Map");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground/60">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-3 rounded-sm border"
          style={{ background: "var(--map-day-ocean)", borderColor: "var(--map-legend-border)" }}
        />
        {t("legendDay")}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-3 rounded-sm border"
          style={{ background: "var(--map-night-ocean)", borderColor: "var(--map-legend-border)" }}
        />
        {t("legendNight")}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true">☀️</span>
        {t("legendSubsolar")}
      </span>
      <span className="ml-auto font-mono tabular-nums">
        {t("utcNow", { time: now.toUTC().toFormat("HH:mm") })}
      </span>
    </div>
  );
}
