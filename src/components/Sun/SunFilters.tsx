"use client";

import { useTranslations } from "next-intl";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * Toggle chips controlling which optional sections show on every Sun card
 * (golden hour, twilight bands, moon phase). Persisted in settingsStore;
 * all default off so the cards start minimal (sunrise/sunset/day length/
 * solar noon only).
 */
export default function SunFilters() {
  const t = useTranslations("Sun");
  const showGoldenHour = useSettingsStore((s) => s.sunShowGoldenHour);
  const showTwilight = useSettingsStore((s) => s.sunShowTwilight);
  const showMoonPhase = useSettingsStore((s) => s.sunShowMoonPhase);
  const setShowGoldenHour = useSettingsStore((s) => s.setSunShowGoldenHour);
  const setShowTwilight = useSettingsStore((s) => s.setSunShowTwilight);
  const setShowMoonPhase = useSettingsStore((s) => s.setSunShowMoonPhase);

  const chips: { key: string; active: boolean; onToggle: () => void }[] = [
    { key: "filterGoldenHour", active: showGoldenHour, onToggle: () => setShowGoldenHour(!showGoldenHour) },
    { key: "filterTwilight", active: showTwilight, onToggle: () => setShowTwilight(!showTwilight) },
    { key: "filterMoonPhase", active: showMoonPhase, onToggle: () => setShowMoonPhase(!showMoonPhase) },
  ];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("filtersLabel")}>
      {chips.map(({ key, active, onToggle }) => (
        <button
          key={key}
          type="button"
          onClick={onToggle}
          aria-pressed={active}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            active
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface/50 text-foreground/60 hover:border-primary/50 hover:text-foreground"
          }`}
        >
          {t(key)}
        </button>
      ))}
    </div>
  );
}
