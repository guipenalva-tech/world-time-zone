import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteUrl } from "@/lib/siteUrl";
import type { AppLocale } from "@/i18n/routing";

interface BreadcrumbProps {
  locale: AppLocale;
}

/**
 * Discreet breadcrumb below the header, with a matching BreadcrumbList
 * JSON-LD block for SEO. Server-rendered since it needs no interactivity.
 */
export default async function Breadcrumb({ locale }: BreadcrumbProps) {
  const t = await getTranslations({ locale, namespace: "Breadcrumb" });
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("home"),
        item: `${siteUrl}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t("comparator"),
        item: `${siteUrl}/${locale}`,
      },
    ],
  };

  return (
    <nav aria-label={t("home")} className="border-b border-border">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-2 text-xs text-foreground/50 sm:px-6">
        <li>
          <Link href="/" className="transition-colors hover:text-foreground">
            {t("home")}
          </Link>
        </li>
        <li aria-hidden="true">›</li>
        <li aria-current="page" className="text-foreground/70">
          {t("comparator")}
        </li>
      </ol>
    </nav>
  );
}
