"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useAlertsStore, type AlarmRepeat, type CityAlarm } from "@/stores/alertsStore";
import { useSettingsStore, resolveHourFormat } from "@/stores/settingsStore";
import { getCityById } from "@/lib/cities";
import { getFlagEmoji } from "@/lib/flags";
import { getLocalizedCityName, getLocalizedCountryName } from "@/lib/i18nNames";
import { dailyOccurrence, onceOccurrence, countdownParts } from "@/lib/alertScheduling";
import type { City } from "@/types/city";
import CitySearch from "@/components/Search/CitySearch";
import { formatDuration } from "./formatDuration";

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function hour24ToDisplay(hour24: number): { hour12: number; period: "AM" | "PM" } {
  const period = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, period };
}

function displayToHour24(hour12: number, period: "AM" | "PM"): number {
  const base = hour12 % 12;
  return period === "AM" ? base : base + 12;
}

interface TimePickerProps {
  hour24: number;
  minute: number;
  hourFormat: "12" | "24";
  onChange: (hour24: number, minute: number) => void;
}

function TimePicker({ hour24, minute, hourFormat, onChange }: TimePickerProps) {
  if (hourFormat === "24") {
    return (
      <div className="flex items-center gap-1.5">
        <select
          value={hour24}
          onChange={(e) => onChange(Number(e.target.value), minute)}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
        >
          {HOURS_24.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}
            </option>
          ))}
        </select>
        <span className="text-foreground/50">:</span>
        <select
          value={minute}
          onChange={(e) => onChange(hour24, Number(e.target.value))}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const { hour12, period } = hour24ToDisplay(hour24);
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={hour12}
        onChange={(e) => onChange(displayToHour24(Number(e.target.value), period), minute)}
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
      >
        {HOURS_12.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-foreground/50">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(hour24, Number(e.target.value))}
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
      <select
        value={period}
        onChange={(e) => onChange(displayToHour24(hour12, e.target.value as "AM" | "PM"), minute)}
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

/**
 * Type 2: alert when it's a specific local time somewhere. City can come
 * from the comparator (quick-pick chips) or from a search across every
 * city — the only alert type that doesn't require any comparator cities.
 */
export default function CityAlarmSection() {
  const t = useTranslations("Alerts.cityAlarm");
  const locale = useLocale();
  const cities = useComparatorStore((s) => s.cities);
  const storedHourFormat = useSettingsStore((s) => s.hourFormat);
  const hourFormat = resolveHourFormat(storedHourFormat, locale);

  const alarms = useAlertsStore((s) => s.cityAlarms);
  const addCityAlarm = useAlertsStore((s) => s.addCityAlarm);
  const updateCityAlarm = useAlertsStore((s) => s.updateCityAlarm);
  const removeCityAlarm = useAlertsStore((s) => s.removeCityAlarm);

  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [hour24, setHour24] = useState(9);
  const [minute, setMinute] = useState(0);
  const [repeat, setRepeat] = useState<AlarmRepeat>("once");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [now, setNow] = useState<DateTime | null>(null);
  useEffect(() => {
    setNow(DateTime.now());
    const interval = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );

  function handleAdd() {
    if (!selectedCity) return;
    addCityAlarm({ cityId: selectedCity.id, hour: hour24, minute, repeat });
    setSelectedCity(null);
    setRepeat("once");
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{t("sectionTitle")}</h2>
        <p className="text-sm text-foreground/60">{t("sectionSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground/60">{t("cityLabel")}</p>

          {sortedCities.length > 0 && (
            <>
              <p className="mb-1 text-xs text-foreground/50">{t("fromCompared")}</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {sortedCities.map(({ city }) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    aria-pressed={selectedCity?.id === city.id}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedCity?.id === city.id
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-surface/50 text-foreground/60 hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    <span aria-hidden="true" className="mr-1">
                      {getFlagEmoji(city.countryCode)}
                    </span>
                    {getLocalizedCityName(city, locale)}
                  </button>
                ))}
              </div>
              <p className="mb-1 text-xs text-foreground/50">{t("searchAny")}</p>
            </>
          )}
          <CitySearch onSelect={setSelectedCity} />
          {selectedCity && (
            <p className="mt-1.5 text-xs text-foreground/60">
              {getFlagEmoji(selectedCity.countryCode)} {getLocalizedCityName(selectedCity, locale)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-foreground/60">{t("timeLabel")}</p>
            <TimePicker
              hour24={hour24}
              minute={minute}
              hourFormat={hourFormat}
              onChange={(h, m) => {
                setHour24(h);
                setMinute(m);
              }}
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-foreground/60">&nbsp;</p>
            <div role="group" className="flex overflow-hidden rounded-lg border border-border text-sm">
              {(["once", "daily"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRepeat(r)}
                  aria-pressed={repeat === r}
                  className={`px-2.5 py-1.5 font-medium transition-colors ${
                    repeat === r
                      ? "bg-primary text-white"
                      : "bg-surface text-foreground/70 hover:bg-background hover:text-foreground"
                  }`}
                >
                  {r === "once" ? t("repeatOnce") : t("repeatDaily")}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedCity}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {t("addButton")}
          </button>
        </div>
        {!selectedCity && <p className="text-xs text-foreground/40">{t("chooseCityFirst")}</p>}
      </div>

      {alarms.length === 0 ? (
        <p className="text-sm text-foreground/50">{t("emptyState")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alarms.map((alarm) => (
            <CityAlarmRow
              key={alarm.id}
              alarm={alarm}
              now={now}
              locale={locale}
              hourFormat={hourFormat}
              editing={editingId === alarm.id}
              onEdit={() => setEditingId(alarm.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(patch) => {
                updateCityAlarm(alarm.id, patch);
                setEditingId(null);
              }}
              onDelete={() => removeCityAlarm(alarm.id)}
              onToggleEnabled={() => updateCityAlarm(alarm.id, { enabled: !alarm.enabled })}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface CityAlarmRowProps {
  alarm: CityAlarm;
  now: DateTime | null;
  locale: string;
  hourFormat: "12" | "24";
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<Pick<CityAlarm, "hour" | "minute" | "repeat" | "enabled">>) => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
}

function CityAlarmRow({
  alarm,
  now,
  locale,
  hourFormat,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onToggleEnabled,
}: CityAlarmRowProps) {
  const t = useTranslations("Alerts.cityAlarm");
  const tDuration = useTranslations("Alerts");
  const city = getCityById(alarm.cityId);
  const [draftHour, setDraftHour] = useState(alarm.hour);
  const [draftMinute, setDraftMinute] = useState(alarm.minute);
  const [draftRepeat, setDraftRepeat] = useState<AlarmRepeat>(alarm.repeat);

  if (!city) return null;

  const cityName = getLocalizedCityName(city, locale);
  const countryName = getLocalizedCountryName(city.countryCode, locale, city.country);

  const timeFormat = hourFormat === "24" ? "HH:mm" : "h:mm a";
  const timeLabel = DateTime.fromObject({ hour: alarm.hour, minute: alarm.minute }).toFormat(timeFormat);

  const completed = alarm.repeat === "once" && alarm.lastFiredKey !== null;

  let countdownLabel: string | null = null;
  if (now && !completed && city) {
    const occurrence =
      alarm.repeat === "daily"
        ? dailyOccurrence(city.timezone, alarm.hour, alarm.minute, now)
        : onceOccurrence(city.timezone, alarm.hour, alarm.minute, now, false);
    if (occurrence.next) {
      countdownLabel = t("firesIn", { duration: formatDuration(countdownParts(now, occurrence.next), tDuration) });
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 rounded-xl border border-primary/50 bg-surface/40 p-4">
        <p className="text-sm font-semibold">
          {cityName} <span className="font-normal text-foreground/50">({countryName})</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <TimePicker
            hour24={draftHour}
            minute={draftMinute}
            hourFormat={hourFormat}
            onChange={(h, m) => {
              setDraftHour(h);
              setDraftMinute(m);
            }}
          />
          <div role="group" className="flex overflow-hidden rounded-lg border border-border text-sm">
            {(["once", "daily"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDraftRepeat(r)}
                aria-pressed={draftRepeat === r}
                className={`px-2.5 py-1.5 font-medium transition-colors ${
                  draftRepeat === r
                    ? "bg-primary text-white"
                    : "bg-surface text-foreground/70 hover:bg-background hover:text-foreground"
                }`}
              >
                {r === "once" ? t("repeatOnce") : t("repeatDaily")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSave({ hour: draftHour, minute: draftMinute, repeat: draftRepeat })}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("save")}
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            {t("cancel")}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-surface/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {cityName} <span className="font-mono font-normal text-foreground/60">{timeLabel}</span>{" "}
          <span className="text-xs font-normal text-foreground/50">
            ({alarm.repeat === "daily" ? t("repeatDaily") : t("repeatOnce")})
          </span>
        </p>
        <p className="text-xs text-foreground/50">
          {completed ? t("completed") : (countdownLabel ?? " ")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-pressed={alarm.enabled}
          onClick={onToggleEnabled}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            alarm.enabled
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface/50 text-foreground/60"
          }`}
        >
          {alarm.enabled ? tDuration("toggleOn") : tDuration("toggleOff")}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground/70 transition-colors hover:text-foreground"
        >
          {t("edit")}
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
