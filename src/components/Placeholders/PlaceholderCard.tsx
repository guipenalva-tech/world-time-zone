"use client";

import { useTranslations } from "next-intl";

interface PlaceholderCardProps {
  title: string;
  text: string;
  icon: React.ReactNode;
}

/**
 * Shared empty-state shell for "coming soon" feature sections (hour-diff
 * chart, world map, ...). Each future feature gets its own thin wrapper
 * around this component so the visual language stays consistent.
 */
export default function PlaceholderCard({
  title,
  text,
  icon,
}: PlaceholderCardProps) {
  const t = useTranslations("Placeholders");

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-foreground/80">{title}</h2>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center">
        <span aria-hidden="true" className="text-foreground/30">
          {icon}
        </span>
        <p className="text-sm font-medium text-foreground/60">{text}</p>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
          {t("comingSoon")}
        </span>
      </div>
    </section>
  );
}
