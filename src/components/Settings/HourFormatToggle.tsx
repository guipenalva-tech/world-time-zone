"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useSettingsStore,
  resolveHourFormat,
  type HourFormat,
} from "@/stores/settingsStore";

interface HourFormatToggleProps {
  className?: string;
}

/**
 * 12h / 24h segmented toggle, persisted in settingsStore. Shared by the
 * header's top-right controls and the settings FAB panel.
 */
export default function HourFormatToggle({
  className = "",
}: HourFormatToggleProps) {
  const locale = useLocale();
  const t = useTranslations("HourFormat");
  const stored = useSettingsStore((s) => s.hourFormat);
  const setHourFormat = useSettingsStore((s) => s.setHourFormat);
  const active = resolveHourFormat(stored, locale);

  function select(format: HourFormat) {
    if (format !== active) setHourFormat(format);
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={`flex overflow-hidden rounded-lg border border-border text-sm ${className}`}
    >
      {(["12", "24"] as const).map((format) => (
        <button
          key={format}
          type="button"
          onClick={() => select(format)}
          aria-pressed={active === format}
          className={`px-2.5 py-1.5 font-medium transition-colors ${
            active === format
              ? "bg-primary text-white"
              : "bg-surface text-foreground/70 hover:bg-background hover:text-foreground"
          }`}
        >
          {format === "12" ? t("format12") : t("format24")}
        </button>
      ))}
    </div>
  );
}
