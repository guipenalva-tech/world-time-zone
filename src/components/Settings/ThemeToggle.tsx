"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSettingsStore } from "@/stores/settingsStore";

const SunIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2.5v2.25M12 19.25v2.25M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.4 19.6l1.6-1.6M18 6l1.6-1.6" />
  </svg>
);

const MoonIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);

/**
 * Hook that resolves the effective (rendered) light/dark side, tracking the
 * OS preference live when the stored theme is "system".
 */
function useEffectiveIsDark(theme: "system" | "light" | "dark"): boolean {
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mql.matches);
    function onChange(e: MediaQueryListEvent) {
      setSystemDark(e.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return theme === "dark" || (theme === "system" && systemDark);
}

interface ThemeToggleProps {
  className?: string;
}

/**
 * Outline icon button cycling system -> light -> dark -> system. The icon
 * always reflects the *effective* theme (so under "system" it follows the
 * OS preference live). Persisted in settingsStore; the actual `data-theme`
 * DOM attribute is synced by <ThemeSync />, and a beforeInteractive inline
 * script in the root layout applies it pre-hydration to avoid a flash.
 */
export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const t = useTranslations("Theme");
  const theme = useSettingsStore((s) => s.theme);
  const cycleTheme = useSettingsStore((s) => s.cycleTheme);
  const isDark = useEffectiveIsDark(theme);

  const label =
    theme === "system" ? t("system") : theme === "light" ? t("light") : t("dark");

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={t("toggle", { current: label })}
      title={t("toggle", { current: label })}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground/70 transition-colors hover:bg-background hover:text-foreground ${className}`}
    >
      {isDark ? MoonIcon : SunIcon}
    </button>
  );
}
