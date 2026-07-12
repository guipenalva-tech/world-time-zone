"use client";

import { useTranslations } from "next-intl";
import type { HourSlot } from "@/types/timezone";
import type { HourFormat } from "@/stores/settingsStore";

interface HourTilesProps {
  slots: HourSlot[];
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  /** Called with a slot's instant ISO string when its tile is clicked/tapped. */
  onSlotClick?: (isoString: string) => void;
  /** Whether each slot (by index, matching `slots`) is inside the selected range. */
  selectedIndices?: boolean[];
  /** "12" shows hour + am/pm, "24" shows zero-padded 0-23 with no meridiem. */
  hourFormat?: HourFormat;
}

/** 12-hour parts for a tile: hour number on top, am/pm below. */
function hourParts12(
  hour: number,
  minute: number,
): { label: string; meridiem: "am" | "pm" | null } {
  const mm = minute > 0 ? `:${String(minute).padStart(2, "0")}` : "";
  const meridiem: "am" | "pm" = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return { label: `${h12}${mm}`, meridiem };
}

/** 24-hour parts for a tile: zero-padded hour, no meridiem. */
function hourParts24(
  hour: number,
  minute: number,
): { label: string; meridiem: "am" | "pm" | null } {
  const mm = minute > 0 ? `:${String(minute).padStart(2, "0")}` : "";
  return { label: `${String(hour).padStart(2, "0")}${mm}`, meridiem: null };
}

export default function HourTiles({
  slots,
  hoveredIndex,
  onHoverIndex,
  onSlotClick,
  selectedIndices,
  hourFormat = "12",
}: HourTilesProps) {
  const tStatus = useTranslations("BusinessStatus");

  return (
    <div
      className="flex"
      onMouseLeave={() => onHoverIndex(null)}
    >
      {slots.map((slot, index) => {
        const isHovered = hoveredIndex === index;
        const isSelected = selectedIndices?.[index] ?? false;
        const isConflict = isSelected && !slot.isBusinessHour;

        let bg = "bg-surface";
        if (slot.isNight) bg = "bg-foreground/15";
        else if (slot.isWeekend) bg = "bg-primary/10";

        const weekendNight = slot.isNight && slot.isWeekend;
        const { label, meridiem } =
          hourFormat === "24"
            ? hourParts24(slot.hour, slot.minute)
            : hourParts12(slot.hour, slot.minute);

        return (
          <button
            type="button"
            key={slot.isoString}
            onMouseEnter={() => onHoverIndex(index)}
            onClick={() => onSlotClick?.(slot.isoString)}
            aria-pressed={isSelected}
            aria-label={`${slot.weekday} ${slot.day} ${slot.month}, ${label}${meridiem ?? ""}${
              isConflict ? `, ${tStatus("conflictSuffix")}` : ""
            }`}
            className={`relative flex h-16 w-11 shrink-0 flex-col items-center justify-center border-r border-border/50 text-xs transition-colors ${bg} ${
              weekendNight ? "ring-1 ring-inset ring-primary/20" : ""
            } ${isHovered ? "outline outline-2 -outline-offset-2 outline-primary/50" : ""} ${
              isSelected ? "bg-primary/20 outline outline-2 -outline-offset-2 outline-primary" : ""
            } ${
              slot.isNow ? "border-2 border-primary font-semibold" : ""
            } ${slot.isNewDay ? "border-l-2 border-l-foreground/30" : ""}`}
            title={`${slot.weekday} ${slot.day} ${slot.month}${
              isConflict ? ` · ${tStatus("conflictSuffix")}` : ""
            }`}
          >
            {isConflict && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-warning/25"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, color-mix(in srgb, var(--warning) 35%, transparent) 0, color-mix(in srgb, var(--warning) 35%, transparent) 1px, transparent 1px, transparent 6px)",
                }}
              />
            )}
            {slot.isNewDay ? (
              <>
                <span className="text-[10px] font-semibold uppercase leading-tight text-foreground/70">
                  {slot.weekday}
                </span>
                <span className="text-[10px] leading-tight text-foreground/50">
                  {slot.day}
                </span>
              </>
            ) : (
              <>
                <span className="font-medium leading-tight text-foreground/80">
                  {label}
                </span>
                {meridiem && (
                  <span className="text-[10px] font-medium uppercase leading-tight tracking-wide text-foreground/65">
                    {meridiem}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
