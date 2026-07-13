"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import type { ComparedCity } from "@/types/city";
import type { HourFormat } from "@/stores/settingsStore";
import { getFlagEmoji } from "@/lib/flags";
import { formatOffset } from "@/lib/timezone";
import { project } from "./projection";

interface CityMarkersProps {
  cities: ComparedCity[];
  referenceCityId: string | null;
  now: DateTime;
  hourFormat: HourFormat;
  tooltipFormatter: (country: string, offset: string) => string;
  ariaLabelFormatter: (city: string, time: string, offset: string) => string;
}

interface MarkerLayout {
  comparedCity: ComparedCity;
  x: number;
  y: number;
  labelOffset: number;
}

/**
 * Simple collision avoidance: markers projected close to one another get
 * their label nudged down in stacked steps so text doesn't overlap. Not
 * pixel-perfect, just enough to keep a cluster of nearby cities legible.
 */
function layoutMarkers(cities: ComparedCity[]): MarkerLayout[] {
  const RADIUS = 55;
  const STEP = 13;
  const placed: { x: number; y: number }[] = [];

  return cities.map((comparedCity) => {
    const { x, y } = project(comparedCity.city.lon, comparedCity.city.lat);
    let level = 0;
    // Find the first vertical stack level that doesn't collide with an
    // already-placed label near this x position.
    // eslint-disable-next-line no-constant-condition
    while (
      placed.some(
        (p) => Math.abs(p.x - x) < RADIUS && Math.abs(p.y - (y + level * STEP)) < STEP - 2,
      )
    ) {
      level++;
    }
    placed.push({ x, y: y + level * STEP });
    return { comparedCity, x, y, labelOffset: level * STEP };
  });
}

export default function CityMarkers({
  cities,
  referenceCityId,
  now,
  hourFormat,
  tooltipFormatter,
  ariaLabelFormatter,
}: CityMarkersProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const timeFormat = hourFormat === "24" ? "HH:mm" : "h:mm a";

  const markers = useMemo(() => layoutMarkers(cities), [cities]);

  return (
    <>
      {markers.map(({ comparedCity, x, y, labelOffset }) => {
        const { city } = comparedCity;
        const isReference = city.id === referenceCityId;
        const isFocused = city.id === focusedId;
        const localTime = now.setZone(city.timezone).toFormat(timeFormat);
        const offset = formatOffset(city.timezone, now);
        const labelY = y + 4 + labelOffset;

        return (
          <g
            key={city.id}
            transform={`translate(${x}, ${y})`}
            className="cursor-pointer"
            onClick={() => setFocusedId((prev) => (prev === city.id ? null : city.id))}
          >
            <title>{tooltipFormatter(city.country, offset)}</title>
            <circle
              r={isReference ? 5 : 3.5}
              fill={isReference ? "var(--primary)" : "var(--foreground)"}
              stroke="var(--background)"
              strokeWidth={1.25}
              opacity={isFocused ? 1 : 0.9}
            />
            <foreignObject
              x={-90}
              y={labelY}
              width={180}
              height={28}
              style={{ overflow: "visible", pointerEvents: "none" }}
            >
              <div
                role="img"
                aria-label={ariaLabelFormatter(city.name, localTime, offset)}
                className={`mx-auto flex w-fit max-w-[178px] items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none whitespace-nowrap shadow-sm ${
                  isReference
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface/95 text-foreground"
                } ${isFocused ? "ring-2 ring-primary" : ""}`}
              >
                <span aria-hidden="true">{getFlagEmoji(city.countryCode)}</span>
                <span className="truncate font-medium">{city.name}</span>
                <span className="font-mono tabular-nums opacity-80">{localTime}</span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </>
  );
}
