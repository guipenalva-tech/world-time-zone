"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * Keeps `<html data-theme>` in sync with the persisted theme choice. "system"
 * removes the attribute so globals.css falls back to `prefers-color-scheme`;
 * "light"/"dark" force one side via the `[data-theme]` CSS overrides.
 *
 * The initial value is already applied pre-hydration by the inline
 * beforeInteractive script in the root layout (see ThemeInitScript), so this
 * only needs to react to later changes (toggle clicks, other tabs).
 */
export default function ThemeSync() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }, [theme]);

  return null;
}
