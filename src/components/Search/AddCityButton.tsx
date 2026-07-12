"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { City } from "@/types/city";
import CitySearch from "./CitySearch";

interface AddCityButtonProps {
  onSelect: (city: City) => void;
  excludeIds: string[];
  /** Controlled open state — the panel is shared by the FAB and per-row "+" buttons. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shared "add a city" panel (bottom sheet on mobile, popover on desktop).
 * Open state is controlled by the parent so any trigger (the unified action
 * FAB, or a per-row "+" button) can reuse the same flow — this component no
 * longer renders its own trigger button.
 */
export default function AddCityButton({
  onSelect,
  excludeIds,
  open,
  onOpenChange,
}: AddCityButtonProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("AddCity");

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    function onPointerDownOutside(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDownOutside);
    };
  }, [open, onOpenChange]);

  function handleSelect(city: City) {
    onSelect(city);
    onOpenChange(false);
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("dialogLabel")}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-end sm:justify-end sm:bg-transparent"
        >
          <div
            ref={panelRef}
            className="w-full max-w-md rounded-t-2xl border border-border bg-background p-4 pb-6 shadow-2xl sm:mb-24 sm:mr-6 sm:w-80 sm:rounded-2xl sm:pb-4"
          >
            <p className="mb-2 text-sm font-medium text-foreground/70">
              {t("heading")}
            </p>
            <CitySearch
              onSelect={handleSelect}
              excludeIds={excludeIds}
              autoFocus
            />
          </div>
        </div>
      )}
    </>
  );
}
