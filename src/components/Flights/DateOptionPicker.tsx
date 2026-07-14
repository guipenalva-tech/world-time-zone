"use client";

import { useTranslations } from "next-intl";
import { DATE_OPTIONS, type DateOption } from "@/lib/flightEstimate";

const LABEL_KEYS: Record<DateOption, string> = {
  today: "dateToday",
  tomorrow: "dateTomorrow",
  in48h: "date48h",
  in1Week: "date1Week",
  in2Weeks: "date2Weeks",
  in3Weeks: "date3Weeks",
  in1Month: "date1Month",
};

interface DateOptionPickerProps {
  value: DateOption;
  onChange: (value: DateOption) => void;
}

/** Departure-date chip row (Today / Tomorrow / 48h / 1-4 weeks out) that
 * drives the price multiplier in flightEstimate.ts — earlier = pricier. */
export default function DateOptionPicker({ value, onChange }: DateOptionPickerProps) {
  const t = useTranslations("Flights");

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("dateLabel")}>
      {DATE_OPTIONS.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface/50 text-foreground/60 hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {t(LABEL_KEYS[option])}
          </button>
        );
      })}
    </div>
  );
}
