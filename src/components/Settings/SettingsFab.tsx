"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import HourFormatToggle from "./HourFormatToggle";
import ThemeToggle from "./ThemeToggle";
import LanguageSelect from "./LanguageSelect";

/**
 * Bottom-right settings FAB (replaces the old actions FAB, which moved to
 * the top "Action" button). Covers theme, 12/24h format, and language, so
 * every display preference is reachable from one place even though theme
 * and language also have dedicated header controls.
 */
export default function SettingsFab() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("Settings");

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDownOutside(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
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

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40">
      {open && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="absolute bottom-16 right-0 max-h-[calc(100vh-6rem)] w-64 overflow-y-auto rounded-lg border border-border bg-background p-3 shadow-xl"
        >
          <p className="mb-2 text-sm font-semibold text-foreground">
            {t("title")}
          </p>

          <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-foreground/50">
            {t("theme")}
          </p>
          <ThemeToggle />

          <p className="mb-1 mt-3 px-1 text-xs font-medium uppercase tracking-wide text-foreground/50">
            {t("hourFormat")}
          </p>
          <HourFormatToggle />

          <p className="mb-1 mt-3 border-t border-border px-1 pt-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
            {t("language")}
          </p>
          <LanguageSelect variant="list" />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("openLabel")}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-foreground/70 shadow-lg transition-colors hover:bg-background hover:text-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <circle cx="12" cy="8" r="3.75" />
          <path d="M4.5 20c0-4.14 3.36-6.75 7.5-6.75s7.5 2.61 7.5 6.75" />
        </svg>
      </button>
    </div>
  );
}
