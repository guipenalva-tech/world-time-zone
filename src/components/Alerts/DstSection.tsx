"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useAlertsStore } from "@/stores/alertsStore";
import { useSettingsStore, resolveHourFormat } from "@/stores/settingsStore";
import { getFlagEmoji } from "@/lib/flags";
import { toLuxonLocale } from "@/lib/timezone";
import { getNextDstTransition } from "@/lib/dst";
import EmptyCitiesInvite from "@/components/Placeholders/EmptyCitiesInvite";

/**
 * Type 1: automatic DST-transition detection for every compared city. Pure
 * display + a persisted "notify me" toggle per city — the actual
 * reminder/moment firing happens app-wide in AlertScheduler.
 */
export default function DstSection() {
  const t = useTranslations("Alerts.dst");
  const locale = useLocale();
  const luxonLocale = toLuxonLocale(locale);
  const cities = useComparatorStore((s) => s.cities);
  const storedHourFormat = useSettingsStore((s) => s.hourFormat);
  const hourFormat = resolveHourFormat(storedHourFormat, locale);
  const timeFormat = hourFormat === "24" ? "HH:mm" : "h:mm a";
  const dstNotify = useAlertsStore((s) => s.dstNotify);
  const setDstNotify = useAlertsStore((s) => s.setDstNotify);

  // Recomputed once a minute — transitions are computed live off `now`
  // rather than cached, so the list stays correct across the transition
  // instant itself without a page reload.
  const [now, setNow] = useState<DateTime | null>(null);
  useEffect(() => {
    setNow(DateTime.now());
    const interval = setInterval(() => setNow(DateTime.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{t("sectionTitle")}</h2>
        <p className="text-sm text-foreground/60">{t("sectionSubtitle")}</p>
      </div>

      {sortedCities.length === 0 ? (
        <EmptyCitiesInvite />
      ) : (
        now && (
          <ul className="flex flex-col gap-2">
            {sortedCities.map(({ city }) => {
              const transition = getNextDstTransition(city.timezone, now);
              const notify = dstNotify[city.id] ?? false;

              return (
                <li
                  key={city.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-surface/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden="true" className="text-lg">
                      {getFlagEmoji(city.countryCode)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{city.name}</p>
                      {transition ? (
                        <>
                          <p className="text-sm text-foreground/70">
                            {transition.direction === "forward" ? t("springForward") : t("fallBack")}
                          </p>
                          <p className="text-xs text-foreground/50">
                            {t("at", {
                              date: transition.at
                                .setZone(city.timezone)
                                .setLocale(luxonLocale)
                                .toFormat("d LLLL"),
                              time: transition.at
                                .setZone(city.timezone)
                                .setLocale(luxonLocale)
                                .toFormat(timeFormat),
                            })}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-foreground/50">{t("noChange")}</p>
                      )}
                    </div>
                  </div>

                  {transition && (
                    <button
                      type="button"
                      aria-pressed={notify}
                      onClick={() => setDstNotify(city.id, !notify)}
                      className={`shrink-0 self-start rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:self-auto ${
                        notify
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-surface/50 text-foreground/60 hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {t("notifyToggle")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}
    </section>
  );
}
