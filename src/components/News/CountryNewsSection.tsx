"use client";

import { useTranslations } from "next-intl";
import { getFlagEmoji } from "@/lib/flags";
import { useCountryNews } from "@/hooks/useCountryNews";
import type { CountryNewsGroup } from "@/lib/newsGroups";
import NewsItemRow from "./NewsItemRow";

interface CountryNewsSectionProps {
  group: CountryNewsGroup;
  locale: string;
}

/** One country's headline feed: header (flag + country + city list), then loading/error/empty/list. */
export default function CountryNewsSection({ group, locale }: CountryNewsSectionProps) {
  const t = useTranslations("News");
  const { status, items, retry } = useCountryNews(group.country, group.countryCode, locale);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-4">
      <header className="flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">
          {getFlagEmoji(group.countryCode)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{group.country}</p>
          <p className="truncate text-xs text-foreground/50">
            {group.cities.map((city) => city.name).join(", ")}
          </p>
        </div>
      </header>

      {status === "loading" && (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-border/60" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-foreground/60">{t("errorText")}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:border-primary/50 hover:text-primary"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {status === "success" && items.length === 0 && (
        <p className="py-6 text-center text-sm text-foreground/50">{t("emptyText")}</p>
      )}

      {status === "success" && items.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <NewsItemRow key={item.link} item={item} locale={locale} />
          ))}
        </ul>
      )}
    </section>
  );
}
