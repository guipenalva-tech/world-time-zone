"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Shown on any secondary view (chart, map, sun, alerts) when the shared
 * comparatorStore has no cities yet — invites the user back to the home
 * comparator, which owns the "add city" flow.
 */
export default function EmptyCitiesInvite() {
  const t = useTranslations("EmptyCities");

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground/70">{t("title")}</p>
      <p className="max-w-sm text-sm text-foreground/50">{t("text")}</p>
      <Link
        href="/"
        className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
