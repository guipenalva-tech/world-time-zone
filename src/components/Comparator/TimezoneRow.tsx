"use client";

import type { DateTime } from "luxon";
import type { ComparedCity } from "@/types/city";
import { getZoneInfo, getHourRow } from "@/lib/timezone";
import HourTiles from "./HourTiles";

interface TimezoneRowProps {
  comparedCity: ComparedCity;
  anchor: DateTime;
  displayInstant: DateTime;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  onRemove: (cityId: string) => void;
  rowRef: (el: HTMLDivElement | null) => void;
  onHandlePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  isDragging: boolean;
  dragDeltaY: number;
  dropIndicator: "top" | "bottom" | null;
}

export default function TimezoneRow({
  comparedCity,
  anchor,
  displayInstant,
  hoveredIndex,
  onHoverIndex,
  onRemove,
  rowRef,
  onHandlePointerDown,
  isDragging,
  dragDeltaY,
  dropIndicator,
}: TimezoneRowProps) {
  const { city } = comparedCity;
  const zoneInfo = getZoneInfo(city.timezone, displayInstant);
  const localNow = displayInstant.setZone(city.timezone);
  const slots = getHourRow(city.timezone, anchor, 24);

  return (
    <div
      ref={rowRef}
      style={
        isDragging
          ? {
              transform: `translateY(${dragDeltaY}px)`,
              position: "relative",
              zIndex: 30,
            }
          : undefined
      }
      className={`flex border-b border-border bg-background last:border-b-0 ${
        isDragging ? "opacity-80 shadow-2xl" : ""
      } ${dropIndicator === "top" ? "border-t-2 border-t-primary" : ""} ${
        dropIndicator === "bottom" ? "border-b-2 border-b-primary" : ""
      }`}
    >
      <div className="sticky left-0 z-10 flex w-44 shrink-0 items-stretch gap-1 border-r border-border bg-background px-1 py-2 sm:w-52">
        <button
          type="button"
          onPointerDown={onHandlePointerDown}
          aria-label={`Reorder ${city.name}`}
          className={`flex touch-none select-none items-center px-1 text-foreground/30 transition-colors hover:text-foreground/70 ${
            isDragging ? "cursor-grabbing text-foreground/70" : "cursor-grab"
          }`}
        >
          ⠿
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{city.name}</p>
              <p className="truncate text-xs text-foreground/50">
                {city.country}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(city.id)}
              aria-label={`Remove ${city.name}`}
              className="shrink-0 rounded p-1 text-foreground/40 transition-colors hover:bg-surface hover:text-foreground"
            >
              ×
            </button>
          </div>

          <div>
            <p className="text-xl font-bold leading-none tabular-nums">
              {localNow.toFormat("h:mm")}
              <span className="ml-1 text-xs font-semibold uppercase text-foreground/60">
                {localNow.toFormat("a")}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/50">
              {zoneInfo.offsetFormatted} · {zoneInfo.abbreviation}
              {zoneInfo.isDST ? " · DST" : ""}
            </p>
          </div>
        </div>
      </div>

      <HourTiles
        slots={slots}
        hoveredIndex={hoveredIndex}
        onHoverIndex={onHoverIndex}
      />
    </div>
  );
}
