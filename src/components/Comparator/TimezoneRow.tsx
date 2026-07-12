"use client";

import type { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import type { ComparedCity } from "@/types/city";
import { getZoneInfo, getHourRow } from "@/lib/timezone";
import { getFlagEmoji } from "@/lib/flags";
import {
  formatLocalRange,
  getRangeBusinessStatus,
  isSlotSelected,
  type BusinessStatus,
} from "@/lib/timeSelection";
import HourTiles from "./HourTiles";

const BUSINESS_STATUS_META: Record<
  BusinessStatus,
  { emoji: string; className: string }
> = {
  business: {
    emoji: "✅",
    className: "border-success/40 bg-success/10 text-success",
  },
  partial: {
    emoji: "⚠️",
    className: "border-warning/40 bg-warning/10 text-warning",
  },
  outside: {
    emoji: "🔴",
    className: "border-danger/40 bg-danger/10 text-danger",
  },
};

interface TimezoneRowProps {
  comparedCity: ComparedCity;
  anchor: DateTime;
  displayInstant: DateTime;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  onRemove: (cityId: string) => void;
  onRequestAdd: () => void;
  rowRef: (el: HTMLDivElement | null) => void;
  onHandlePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  isDragging: boolean;
  dragDeltaY: number;
  dropIndicator: "top" | "bottom" | null;
  onSlotClick: (isoString: string) => void;
  selectionStart: string | null;
  selectionEnd: string | null;
}

export default function TimezoneRow({
  comparedCity,
  anchor,
  displayInstant,
  hoveredIndex,
  onHoverIndex,
  onRemove,
  onRequestAdd,
  rowRef,
  onHandlePointerDown,
  isDragging,
  dragDeltaY,
  dropIndicator,
  onSlotClick,
  selectionStart,
  selectionEnd,
}: TimezoneRowProps) {
  const locale = useLocale();
  const t = useTranslations("Comparator");
  const tStatus = useTranslations("BusinessStatus");
  const { city } = comparedCity;
  const zoneInfo = getZoneInfo(city.timezone, displayInstant);
  const localNow = displayInstant.setZone(city.timezone);
  const slots = getHourRow(city.timezone, anchor, 24, locale);
  const selectedIndices = slots.map((slot) =>
    isSlotSelected(slot.isoString, selectionStart, selectionEnd),
  );
  const rangeLabel =
    selectionStart && selectionEnd
      ? formatLocalRange(city.timezone, selectionStart, selectionEnd)
      : null;
  const businessStatus =
    selectionStart && selectionEnd
      ? getRangeBusinessStatus(city.timezone, selectionStart, selectionEnd)
      : null;
  const statusMeta = businessStatus ? BUSINESS_STATUS_META[businessStatus] : null;

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
          aria-label={t("reorder", { city: city.name })}
          className={`flex touch-none select-none items-center px-1 text-foreground/30 transition-colors hover:text-foreground/70 ${
            isDragging ? "cursor-grabbing text-foreground/70" : "cursor-grab"
          }`}
        >
          ⠿
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                <span aria-hidden="true" className="mr-1">
                  {getFlagEmoji(city.countryCode)}
                </span>
                {city.name}
              </p>
              <p className="truncate text-xs text-foreground/50">
                {city.country}
              </p>
            </div>
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => onRemove(city.id)}
                aria-label={t("remove", { city: city.name })}
                title={t("remove", { city: city.name })}
                className="rounded p-1 leading-none text-foreground/40 transition-colors hover:bg-surface hover:text-foreground"
              >
                ×
              </button>
              <button
                type="button"
                onClick={onRequestAdd}
                aria-label={t("addTimeZone")}
                title={t("addTimeZone")}
                className="rounded p-1 leading-none text-foreground/40 transition-colors hover:bg-surface hover:text-foreground"
              >
                +
              </button>
            </div>
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
            {rangeLabel && (
              <p className="mt-1 truncate text-xs font-semibold text-primary">
                {rangeLabel}
              </p>
            )}
            {statusMeta && (
              <p
                className={`mt-1 inline-flex w-fit items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${statusMeta.className}`}
              >
                <span aria-hidden="true">{statusMeta.emoji}</span>
                {businessStatus ? tStatus(businessStatus) : null}
              </p>
            )}
          </div>
        </div>
      </div>

      <HourTiles
        slots={slots}
        hoveredIndex={hoveredIndex}
        onHoverIndex={onHoverIndex}
        onSlotClick={onSlotClick}
        selectedIndices={selectedIndices}
      />
    </div>
  );
}
