"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import type { ComparedCity } from "@/types/city";
import type { HourFormat } from "@/stores/settingsStore";
import { getFlagEmoji } from "@/lib/flags";
import { formatOffset } from "@/lib/timezone";
import { getLocalizedCityName, getLocalizedCountryName } from "@/lib/i18nNames";
import { project, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT } from "./projection";

interface CityMarkersProps {
  cities: ComparedCity[];
  referenceCityId: string | null;
  now: DateTime;
  hourFormat: HourFormat;
  locale: string;
  tooltipFormatter: (country: string, offset: string) => string;
  ariaLabelFormatter: (city: string, time: string, offset: string) => string;
}

interface MarkerLayout {
  comparedCity: ComparedCity;
  leftPct: number;
  topPct: number;
  labelOffset: number;
}

/**
 * Simple collision avoidance: markers projected close to one another get
 * their label nudged down in stacked steps so text doesn't overlap. Not
 * pixel-perfect, just enough to keep a cluster of nearby cities legible.
 */
function layoutMarkers(cities: ComparedCity[]): MarkerLayout[] {
  const RADIUS = 55;
  const STEP = 15;
  const placed: { x: number; y: number }[] = [];

  return cities
    .filter((c) => Number.isFinite(c.city.lat) && Number.isFinite(c.city.lon))
    .map((comparedCity) => {
      const { x, y } = project(comparedCity.city.lon, comparedCity.city.lat);
      let level = 0;
      while (
        placed.some(
          (p) => Math.abs(p.x - x) < RADIUS && Math.abs(p.y - (y + level * STEP)) < STEP - 2,
        )
      ) {
        level++;
      }
      placed.push({ x, y: y + level * STEP });
      return {
        comparedCity,
        leftPct: (x / WORLD_MAP_WIDTH) * 100,
        topPct: (y / WORLD_MAP_HEIGHT) * 100,
        labelOffset: level * STEP,
      };
    });
}

/**
 * HTML overlay (not SVG) positioned absolutely over the map via percentage
 * coordinates from the same equirectangular projection — foreignObject
 * inside the SVG proved unreliable for text layout across browsers when
 * the SVG itself is scaled via viewBox, so markers/labels live in a plain
 * absolutely-positioned div stacked on top of the map SVG instead.
 */
export default function CityMarkers({
  cities,
  referenceCityId,
  now,
  hourFormat,
  locale,
  tooltipFormatter,
  ariaLabelFormatter,
}: CityMarkersProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const timeFormat = hourFormat === "24" ? "HH:mm" : "h:mm a";

  const markers = useMemo(() => layoutMarkers(cities), [cities]);

  return (
    <div className="pointer-events-none absolute inset-0">
      {markers.map(({ comparedCity, leftPct, topPct, labelOffset }) => {
        const { city } = comparedCity;
        const isReference = city.id === referenceCityId;
        const isFocused = city.id === focusedId;
        const localTime = now.setZone(city.timezone).toFormat(timeFormat);
        const offset = formatOffset(city.timezone, now);
        const cityName = getLocalizedCityName(city, locale);
        const countryName = getLocalizedCountryName(city.countryCode, locale, city.country);

        return (
          <button
            key={city.id}
            type="button"
            title={tooltipFormatter(countryName, offset)}
            aria-label={ariaLabelFormatter(cityName, localTime, offset)}
            onClick={() => setFocusedId((prev) => (prev === city.id ? null : city.id))}
            className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
            style={{ left: `${leftPct}%`, top: `${topPct}%`, zIndex: isFocused ? 20 : 10 }}
          >
            <span
              aria-hidden="true"
              className="block rounded-full ring-2"
              style={{
                width: isReference ? 10 : 8,
                height: isReference ? 10 : 8,
                background: isReference ? "var(--primary)" : "var(--foreground)",
                ["--tw-ring-color" as string]: "var(--background)",
              }}
            />
            <span
              aria-hidden="true"
              className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none whitespace-nowrap shadow-sm ${
                isReference
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface/95 text-foreground"
              } ${isFocused ? "ring-2 ring-primary" : ""}`}
              style={{ marginTop: labelOffset }}
            >
              <span>{getFlagEmoji(city.countryCode)}</span>
              <span className="max-w-20 truncate font-medium">{cityName}</span>
              <span className="font-mono tabular-nums opacity-80">{localTime}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
