"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import {
  useAlertsStore,
  BUSINESS_HOURS_LEAD_OPTIONS,
  type BusinessHoursAlert,
  type BusinessHoursLeadMinutes,
} from "@/stores/alertsStore";
import { getCityById } from "@/lib/cities";
import { getFlagEmoji } from "@/lib/flags";
import { getLocalizedCityName } from "@/lib/i18nNames";
import { businessHoursOccurrence, countdownParts } from "@/lib/alertScheduling";
import EmptyCitiesInvite from "@/components/Placeholders/EmptyCitiesInvite";
import { formatDuration } from "./formatDuration";

/**
 * Type 3: a heads-up before the local business day (9:00-18:00, Mon-Fri)
 * ends, with a configurable lead time. City choice is restricted to the
 * comparator's compared cities (unlike the city-alarm section, which
 * allows searching any city).
 */
export default function BusinessHoursSection() {
  const t = useTranslations("Alerts.businessHours");
  const tRoot = useTranslations("Alerts");
  const locale = useLocale();
  const cities = useComparatorStore((s) => s.cities);
  const alerts = useAlertsStore((s) => s.businessHoursAlerts);
  const addBusinessHoursAlert = useAlertsStore((s) => s.addBusinessHoursAlert);
  const updateBusinessHoursAlert = useAlertsStore((s) => s.updateBusinessHoursAlert);
  const removeBusinessHoursAlert = useAlertsStore((s) => s.removeBusinessHoursAlert);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );

  const [cityId, setCityId] = useState<string>("");
  const [leadMinutes, setLeadMinutes] = useState<BusinessHoursLeadMinutes>(60);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [now, setNow] = useState<DateTime | null>(null);
  useEffect(() => {
    setNow(DateTime.now());
    const interval = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sortedCities.length > 0 && !cityId) setCityId(sortedCities[0].city.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedCities.length]);

  function handleAdd() {
    if (!cityId) return;
    addBusinessHoursAlert({ cityId, leadMinutes });
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{t("sectionTitle")}</h2>
        <p className="text-sm text-foreground/60">{t("sectionSubtitle")}</p>
      </div>

      {sortedCities.length === 0 ? (
        <EmptyCitiesInvite />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-surface/40 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/60" htmlFor="bh-city">
                {t("cityLabel")}
              </label>
              <select
                id="bh-city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              >
                {sortedCities.map(({ city }) => (
                  <option key={city.id} value={city.id}>
                    {getLocalizedCityName(city, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/60" htmlFor="bh-lead">
                {t("leadLabel")}
              </label>
              <select
                id="bh-lead"
                value={leadMinutes}
                onChange={(e) => setLeadMinutes(Number(e.target.value) as BusinessHoursLeadMinutes)}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              >
                {BUSINESS_HOURS_LEAD_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {t(`leadOptions.${minutes}`)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {t("addButton")}
            </button>
          </div>

          {alerts.length === 0 ? (
            <p className="text-sm text-foreground/50">{t("emptyState")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {alerts.map((alert) => (
                <BusinessHoursRow
                  key={alert.id}
                  alert={alert}
                  now={now}
                  locale={locale}
                  cityOptions={sortedCities.map((c) => c.city)}
                  editing={editingId === alert.id}
                  onEdit={() => setEditingId(alert.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(patch) => {
                    updateBusinessHoursAlert(alert.id, patch);
                    setEditingId(null);
                  }}
                  onDelete={() => removeBusinessHoursAlert(alert.id)}
                  onToggleEnabled={() =>
                    updateBusinessHoursAlert(alert.id, { enabled: !alert.enabled })
                  }
                  tRoot={tRoot}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

interface BusinessHoursRowProps {
  alert: BusinessHoursAlert;
  now: DateTime | null;
  locale: string;
  cityOptions: { id: string; name: string; countryCode: string }[];
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<Pick<BusinessHoursAlert, "leadMinutes" | "enabled">>) => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  tRoot: ReturnType<typeof useTranslations>;
}

function BusinessHoursRow({
  alert,
  now,
  locale,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onToggleEnabled,
  tRoot,
}: BusinessHoursRowProps) {
  const t = useTranslations("Alerts.businessHours");
  const city = getCityById(alert.cityId);
  const [draftLead, setDraftLead] = useState<BusinessHoursLeadMinutes>(alert.leadMinutes);

  if (!city) return null;

  const cityName = getLocalizedCityName(city, locale);

  let countdownLabel: string | null = null;
  if (now) {
    const occurrence = businessHoursOccurrence(city.timezone, alert.leadMinutes, now);
    if (occurrence.next) {
      countdownLabel = t("firesIn", { duration: formatDuration(countdownParts(now, occurrence.next), tRoot) });
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 rounded-xl border border-primary/50 bg-surface/40 p-4">
        <p className="text-sm font-semibold">{cityName}</p>
        <select
          value={draftLead}
          onChange={(e) => setDraftLead(Number(e.target.value) as BusinessHoursLeadMinutes)}
          className="w-fit rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
        >
          {BUSINESS_HOURS_LEAD_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {t(`leadOptions.${minutes}`)}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSave({ leadMinutes: draftLead })}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {tRoot("cityAlarm.save")}
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            {tRoot("cityAlarm.cancel")}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-surface/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          <span aria-hidden="true" className="mr-1.5">
            {getFlagEmoji(city.countryCode)}
          </span>
          {cityName}{" "}
          <span className="text-xs font-normal text-foreground/50">
            ({t(`leadOptions.${alert.leadMinutes}`)})
          </span>
        </p>
        <p className="text-xs text-foreground/50">{countdownLabel ?? " "}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-pressed={alert.enabled}
          onClick={onToggleEnabled}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            alert.enabled
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface/50 text-foreground/60"
          }`}
        >
          {alert.enabled ? tRoot("toggleOn") : tRoot("toggleOff")}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground/70 transition-colors hover:text-foreground"
        >
          {tRoot("cityAlarm.edit")}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("deleteAriaLabel", { city: cityName })}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground/70 transition-colors hover:border-danger/50 hover:text-danger"
        >
          {t("delete")}
        </button>
      </div>
    </li>
  );
}
