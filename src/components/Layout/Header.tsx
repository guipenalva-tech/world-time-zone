"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useComparatorStore } from "@/stores/comparatorStore";
import type { City } from "@/types/city";
import CitySearch from "@/components/Search/CitySearch";
import LanguageSelect from "@/components/Settings/LanguageSelect";
import HourFormatToggle from "@/components/Settings/HourFormatToggle";
import ThemeToggle from "@/components/Settings/ThemeToggle";
import NavBar from "./NavBar";

/**
 * Fixed top header: logo, city search (reuses the same "add city" flow as
 * the Action menu / per-row + button), and the top-right controls (hour
 * format + language). On mobile the search collapses to an icon and the
 * controls collapse into a small menu, to keep the bar compact at 375px.
 */
export default function Header() {
  const t = useTranslations("Header");
  const cities = useComparatorStore((s) => s.cities);
  const addCity = useComparatorStore((s) => s.addCity);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onPointerDownOutside(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDownOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  function handleSelect(city: City) {
    addCity(city);
    setMobileSearchOpen(false);
    setToast(t("cityAdded", { city: city.name }));
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }

  const existingIds = cities.map((c) => c.city.id);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-primary"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
          <span className="hidden sm:inline">{t("brand")}</span>
        </Link>

        {/* Desktop: search bar centered */}
        <div className="hidden flex-1 justify-center sm:flex">
          <CitySearch onSelect={handleSelect} excludeIds={existingIds} />
        </div>

        {/* Desktop: right controls */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <ThemeToggle />
          <HourFormatToggle />
          <LanguageSelect />
        </div>

        {/* Mobile: search icon + menu toggle */}
        <div className="ml-auto flex items-center gap-1 sm:hidden">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label={t("searchToggle")}
            aria-expanded={mobileSearchOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-surface hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={t("menuToggle")}
              aria-haspopup="true"
              aria-expanded={mobileMenuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-surface hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <circle cx="12" cy="8" r="3.75" />
                <path d="M4.5 20c0-4.14 3.36-6.75 7.5-6.75s7.5 2.61 7.5 6.75" />
              </svg>
            </button>

            {mobileMenuOpen && (
              <div
                role="dialog"
                aria-label={t("menuToggle")}
                className="absolute right-0 z-40 mt-2 flex max-h-[calc(100vh-5rem)] w-52 flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-background p-3 shadow-xl"
              >
                <p className="px-0.5 text-xs font-medium uppercase tracking-wide text-foreground/50">
                  {t("themeLabel")}
                </p>
                <ThemeToggle />
                <p className="mt-1 px-0.5 text-xs font-medium uppercase tracking-wide text-foreground/50">
                  {t("hourFormatLabel")}
                </p>
                <HourFormatToggle />
                <p className="mt-1 px-0.5 text-xs font-medium uppercase tracking-wide text-foreground/50">
                  {t("languageLabel")}
                </p>
                <LanguageSelect variant="list" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: expanded search row */}
      {mobileSearchOpen && (
        <div className="border-t border-border px-4 py-2 sm:hidden">
          <CitySearch onSelect={handleSelect} excludeIds={existingIds} autoFocus />
        </div>
      )}

      <NavBar />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg"
        >
          {toast}
        </div>
      )}
    </header>
  );
}
