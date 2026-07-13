"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSettingsStore } from "@/stores/settingsStore";
import { SunIcon, MoonIcon } from "@/components/icons/SunMoonIcons";

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
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
