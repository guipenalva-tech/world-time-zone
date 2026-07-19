import type { ReactNode } from "react";
import { getFlagEmoji } from "@/lib/flags";
import type { ComparedCity } from "@/types/city";

interface SectionHeaderProps {
  /** Anchor id for jump-nav / in-page hash links, e.g. "map". */
  id: string;
  icon: ReactNode;
  title: string;
  cities: ComparedCity[];
}

/**
 * Divider between home-dashboard sections: icon + localized title, plus a
 * small flag per compared city (tooltip = city name) so it's obvious at a
 * glance which cities the section below applies to. Also the scroll target
 * for the jump nav and any #hash link — `scroll-mt` offsets it below the
 * sticky header (top bar + NavBar row) so the heading isn't hidden after a
 * jump.
 */
export default function SectionHeader({ id, icon, title, cities }: SectionHeaderProps) {
  return (
    <div
      id={id}
      className="flex scroll-mt-28 flex-wrap items-center gap-2 border-t border-border/60 px-4 pt-8 sm:px-6"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>

      {cities.length > 0 && (
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {cities.map((c) => (
            <span
              key={c.city.id}
              title={c.city.name}
              aria-label={c.city.name}
              className="text-base leading-none"
            >
              {getFlagEmoji(c.city.countryCode)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
