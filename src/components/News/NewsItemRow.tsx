"use client";

import { DateTime } from "luxon";
import { useTranslations } from "next-intl";
import type { NewsItem } from "@/app/api/news/route";
import { classifyHeadline, type NewsSeverity } from "@/lib/newsSeverity";
import { toLuxonLocale } from "@/lib/timezone";

const SEVERITY_CLASS: Record<NewsSeverity, string> = {
  disaster: "border-danger/40 bg-danger/10 text-danger",
  warning: "border-warning/40 bg-warning/10 text-warning",
  disruption: "border-warning/40 bg-warning/10 text-warning",
};

interface NewsItemRowProps {
  item: NewsItem;
  locale: string;
}

/** A single headline: title link, optional severity badge, source + relative time. */
export default function NewsItemRow({ item, locale }: NewsItemRowProps) {
  const t = useTranslations("News");
  const severity = classifyHeadline(item.title);
  const luxonLocale = toLuxonLocale(locale);
  const relative = item.pubDate
    ? DateTime.fromISO(item.pubDate).setLocale(luxonLocale).toRelative()
    : null;

  return (
    <li className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground hover:text-primary hover:underline"
        >
          {item.title}
        </a>
        {severity && (
          <span
            className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_CLASS[severity]}`}
          >
            {t(`badge.${severity}`)}
          </span>
        )}
      </div>
      <p className="text-xs text-foreground/50">
        {item.source}
        {relative ? ` · ${relative}` : ""}
      </p>
    </li>
  );
}
