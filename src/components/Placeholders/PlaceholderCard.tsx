"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface PlaceholderCardProps {
  title: string;
  text: string;
  icon: React.ReactNode;
  /** When set, the whole card becomes a link (a clickable teaser) instead
   * of showing the static "coming soon" badge. */
  href?: "/chart" | "/map" | "/sun" | "/alerts";
}

/**
 * Shared empty-state shell for feature sections. Without `href`, it's a
 * static "coming soon" placeholder (used inside the stub pages themselves).
 * With `href`, it becomes a clickable teaser linking to the full page (used
 * on the home comparator for the hour-diff/map sections).
 */
export default function PlaceholderCard({
  title,
  text,
  icon,
  href,
}: PlaceholderCardProps) {
  const t = useTranslations("Placeholders");

  const body = (
    <div
      className={`flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center transition-colors ${
        href ? "hover:border-primary/50 hover:bg-surface" : ""
      }`}
    >
      <span aria-hidden="true" className="text-foreground/30">
        {icon}
      </span>
      <p className="text-sm font-medium text-foreground/60">{text}</p>
      {href ? (
        <span className="text-xs font-semibold text-primary">{t("viewPage")}</span>
      ) : (
        <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
          {t("comingSoon")}
        </span>
      )}
    </div>
  );

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-foreground/80">{title}</h2>
      {href ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </section>
  );
}
