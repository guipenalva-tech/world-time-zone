"use client";

import { useTranslations } from "next-intl";
import NotificationPermissionBanner from "./NotificationPermissionBanner";
import DstSection from "./DstSection";
import CityAlarmSection from "./CityAlarmSection";
import BusinessHoursSection from "./BusinessHoursSection";

/**
 * Alerts view (/alerts): three client-side alert types (DST transitions,
 * city alarms, business-hours warnings) — no backend, everything fires
 * from AlertScheduler while this tab stays open (see the limitation notice
 * below, and the fuller explanation in AlertScheduler's own docstring).
 */
export default function AlertsView() {
  const t = useTranslations("Alerts");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pb-24 pt-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("pageTitle")}</h1>
        <p className="text-sm text-foreground/60">{t("pageSubtitle")}</p>
      </div>

      <NotificationPermissionBanner />

      <p className="text-xs text-foreground/40">{t("limitationNotice")}</p>

      <BusinessHoursSection />
      <DstSection />
      <CityAlarmSection />
    </div>
  );
}
