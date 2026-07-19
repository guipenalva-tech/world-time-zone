"use client";

import { getFlagEmoji } from "@/lib/flags";
import type { CountryNewsGroup } from "@/lib/newsGroups";

interface NewsCountryFilterProps {
  groups: CountryNewsGroup[];
  value: string | null;
  onChange: (countryCode: string | null) => void;
  allLabel: string;
}

const chipClass = (active: boolean) =>
  `flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-white"
      : "border-border bg-surface/60 text-foreground/70 hover:border-primary/50 hover:text-primary"
  }`;

/**
 * Country chip filter for the home dashboard's News section only — narrows
 * the country groups shown below to a single country. "All" (default)
 * shows every compared country, same as the dedicated /news page.
 */
export default function NewsCountryFilter({
  groups,
  value,
  onChange,
  allLabel,
}: NewsCountryFilterProps) {
  if (groups.length === 0) return null;

  return (
    <div role="group" aria-label={allLabel} className="flex flex-wrap gap-1.5 px-4 sm:px-6">
      <button type="button" onClick={() => onChange(null)} aria-pressed={value === null} className={chipClass(value === null)}>
        {allLabel}
      </button>
      {groups.map((group) => (
        <button
          key={group.countryCode}
          type="button"
          onClick={() => onChange(group.countryCode)}
          aria-pressed={value === group.countryCode}
          className={chipClass(value === group.countryCode)}
        >
          <span aria-hidden="true">{getFlagEmoji(group.countryCode)}</span>
          {group.country}
        </button>
      ))}
    </div>
  );
}
