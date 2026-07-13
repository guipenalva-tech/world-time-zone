"use client";

import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useAlertsStore } from "@/stores/alertsStore";
import { useSettingsStore, resolveHourFormat } from "@/stores/settingsStore";
import { getCityById } from "@/lib/cities";
import { toLuxonLocale } from "@/lib/timezone";
import { getNextDstTransition } from "@/lib/dst";
import {
  dailyOccurrence,
  onceOccurrence,
  businessHoursOccurrence,
  shouldFire,
  shouldFireOnce,
} from "@/lib/alertScheduling";

const TICK_MS = 30_000;
const TOAST_MS = 6000;

const LEAD_LABEL_MINUTES: Record<number, string> = {
  15: "15m",
  30: "30m",
  45: "45m",
  60: "1h",
  120: "2h",
  180: "3h",
  240: "4h",
  300: "5h",
  360: "6h",
  420: "7h",
};

/**
 * Invisible, app-wide alert engine for /alerts: ticks every 30s and checks
 * all three alarm types (DST transitions, city alarms, business-hours
 * warnings) against the current instant, firing a system Notification (if
 * permission was granted) and always an in-app toast as a fallback. Mounted
 * once in the root layout, like StoreHydrator, so alarms fire regardless of
 * which page is open.
 *
 * Known limitation (documented in the UI too): this only runs while a tab
 * is open. Multiple open tabs will each fire independently. If the tab was
 * asleep, only occurrences missed by less than an hour are caught up on
 * waking — older misses are silently skipped (see shouldFireOnce).
 */
export default function AlertScheduler() {
  const t = useTranslations("Alerts.notifications");
  const locale = useLocale();
  const storedHourFormat = useSettingsStore((s) => s.hourFormat);
  const hourFormat = resolveHourFormat(storedHourFormat, locale);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const luxonLocale = toLuxonLocale(locale);
    const timeFormat = hourFormat === "24" ? "HH:mm" : "h:mm a";

    function fireNotification(title: string, body: string) {
      setToast(body);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, { body });
        } catch {
          // Some browsers throw on `new Notification` even when permission
          // is granted (e.g. iOS Safari home-screen quirks) — the in-app
          // toast above already covers the notification either way.
        }
      }
    }

    function tick() {
      const now = DateTime.now();
      const alerts = useAlertsStore.getState();
      if (!alerts.hasHydrated) return;
      const cities = useComparatorStore.getState().cities;

      // --- Type 1: DST transitions -----------------------------------
      for (const comparedCity of cities) {
        const city = comparedCity.city;
        if (!alerts.dstNotify[city.id]) continue;

        const transition = getNextDstTransition(city.timezone, now);
        if (!transition) continue;

        const fired = alerts.dstFired[city.id] ?? { reminderKey: null, momentKey: null };
        const directionKey = transition.direction === "forward" ? "springForward" : "fallBack";

        const reminderCheck = shouldFireOnce(
          transition.at.minus({ days: 1 }),
          now,
          fired.reminderKey,
        );
        if (reminderCheck.fire && reminderCheck.key) {
          fireNotification(
            t("dstReminderTitle"),
            t("dstReminderBody", {
              city: city.name,
              direction: t(`direction.${directionKey}`),
              time: transition.at.setZone(city.timezone).setLocale(luxonLocale).toFormat(timeFormat),
              date: transition.at.setZone(city.timezone).setLocale(luxonLocale).toFormat("d LLL"),
            }),
          );
          alerts.markDstFired(city.id, "reminder", reminderCheck.key);
        }

        const momentCheck = shouldFireOnce(transition.at, now, fired.momentKey);
        if (momentCheck.fire && momentCheck.key) {
          fireNotification(
            t("dstMomentTitle"),
            t("dstMomentBody", {
              city: city.name,
              direction: t(`direction.${directionKey}`),
            }),
          );
          alerts.markDstFired(city.id, "moment", momentCheck.key);
        }
      }

      // --- Type 2: city alarms -----------------------------------------
      for (const alarm of alerts.cityAlarms) {
        if (!alarm.enabled) continue;
        const city = getCityById(alarm.cityId);
        if (!city) continue;

        const occurrence =
          alarm.repeat === "daily"
            ? dailyOccurrence(city.timezone, alarm.hour, alarm.minute, now)
            : onceOccurrence(
                city.timezone,
                alarm.hour,
                alarm.minute,
                now,
                alarm.lastFiredKey !== null,
              );
        const check = shouldFire(occurrence, alarm.lastFiredKey, now);
        if (check.fire && check.key) {
          fireNotification(
            t("cityAlarmTitle"),
            t("cityAlarmBody", {
              city: city.name,
              time: now.setZone(city.timezone).setLocale(luxonLocale).toFormat(timeFormat),
            }),
          );
          alerts.markCityAlarmFired(alarm.id, check.key);
        }
      }

      // --- Type 3: business-hours warnings ------------------------------
      for (const alert of alerts.businessHoursAlerts) {
        if (!alert.enabled) continue;
        const city = getCityById(alert.cityId);
        if (!city) continue;

        const occurrence = businessHoursOccurrence(city.timezone, alert.leadMinutes, now);
        const check = shouldFire(occurrence, alert.lastFiredKey, now);
        if (check.fire && check.key) {
          const closeTime = now.setZone(city.timezone).set({ hour: 18, minute: 0 });
          fireNotification(
            t("businessHoursTitle"),
            t("businessHoursBody", {
              city: city.name,
              lead: LEAD_LABEL_MINUTES[alert.leadMinutes] ?? `${alert.leadMinutes}m`,
              time: closeTime.setLocale(luxonLocale).toFormat(timeFormat),
            }),
          );
          alerts.markBusinessHoursFired(alert.id, check.key);
        }
      }
    }

    tick();
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [t, locale, hourFormat]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border border-border bg-background px-4 py-2 text-center text-sm font-medium text-foreground shadow-lg"
    >
      {toast}
    </div>
  );
}
