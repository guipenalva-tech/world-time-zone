"use client";

import type { HourSlot } from "@/types/timezone";

interface HourTilesProps {
  slots: HourSlot[];
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}

function formatHourLabel(hour: number, minute: number): string {
  const mm = minute > 0 ? `:${String(minute).padStart(2, "0")}` : "";
  if (hour === 0) return `12${mm}a`;
  if (hour < 12) return `${hour}${mm}a`;
  if (hour === 12) return `12${mm}p`;
  return `${hour - 12}${mm}p`;
}

export default function HourTiles({
  slots,
  hoveredIndex,
  onHoverIndex,
}: HourTilesProps) {
  return (
    <div
      className="flex"
      onMouseLeave={() => onHoverIndex(null)}
    >
      {slots.map((slot, index) => {
        const isHovered = hoveredIndex === index;

        let bg = "bg-surface";
        if (slot.isNight) bg = "bg-foreground/15";
        else if (slot.isWeekend) bg = "bg-primary/10";

        const weekendNight = slot.isNight && slot.isWeekend;

        return (
          <div
            key={slot.isoString}
            onMouseEnter={() => onHoverIndex(index)}
            className={`flex h-14 w-11 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-border/50 text-xs transition-colors ${bg} ${
              weekendNight ? "ring-1 ring-inset ring-primary/20" : ""
            } ${isHovered ? "outline outline-2 -outline-offset-2 outline-primary/50" : ""} ${
              slot.isNow ? "border-2 border-primary font-semibold" : ""
            } ${slot.isNewDay ? "border-l-2 border-l-foreground/30" : ""}`}
            title={`${slot.weekday} ${slot.day} ${slot.month}`}
          >
            {slot.isNewDay ? (
              <>
                <span className="text-[10px] font-semibold uppercase text-foreground/70">
                  {slot.weekday}
                </span>
                <span className="text-[10px] text-foreground/50">
                  {slot.day}
                </span>
              </>
            ) : (
              <span className="text-foreground/80">
                {formatHourLabel(slot.hour, slot.minute)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
