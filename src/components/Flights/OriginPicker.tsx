"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getFlagEmoji } from "@/lib/flags";
import { getLocalizedCityName } from "@/lib/i18nNames";
import CitySearch from "@/components/Search/CitySearch";
import type { City } from "@/types/city";

interface OriginPickerProps {
  origin: City;
  onChange: (city: City) => void;
}

/**
 * "Flying from: <city> [Change]" row. Origin defaults to the detected/
 * LocationCard city (resolved by the caller), but the override picked here
 * is local to the /flights page only — it doesn't touch settingsStore, so
 * switching the trip origin here never affects the home LocationCard.
 */
export default function OriginPicker({ origin, onChange }: OriginPickerProps) {
  const t = useTranslations("Flights");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDownOutside(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDownOutside);
    };
  }, [open]);

  function handlePick(city: City) {
    onChange(city);
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-foreground/50">{t("originLabel")}</span>
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <span aria-hidden="true">{getFlagEmoji(origin.countryCode)}</span>
        {getLocalizedCityName(origin, locale)}
      </span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground/70 transition-colors hover:bg-background hover:text-foreground"
        >
          {t("changeOrigin")}
        </button>

        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t("changeOrigin")}
            className="absolute left-0 top-full z-40 mt-2 w-72 rounded-lg border border-border bg-background p-3 text-left shadow-xl"
          >
            <CitySearch onSelect={handlePick} autoFocus />
          </div>
        )}
      </div>
    </div>
  );
}
