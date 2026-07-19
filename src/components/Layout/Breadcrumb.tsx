"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getSiteUrl } from "@/lib/siteUrl";
import type { AppLocale } from "@/i18n/routing";

interface BreadcrumbProps {
  locale: AppLocale;
}

type PageKey =
  | "comparator"
  | "chart"
  | "map"
  | "sun"
  | "alerts"
  | "weather"
  | "currency"
  | "news"
  | "flights"
  | "privacy"
  | "terms"
  | "about"
  | "contact";

/** Maps a (locale-stripped) pathname to the current page's breadcrumb key. */
function pageKeyFromPathname(pathname: string): PageKey {
  switch (pathname) {
    case "/chart":
      return "chart";
    case "/map":
      return "map";
    case "/sun":
      return "sun";
    case "/alerts":
      return "alerts";
    case "/weather":
      return "weather";
    case "/currency":
      return "currency";
    case "/news":
      return "news";
    case "/flights":
      return "flights";
    case "/privacy":
      return "privacy";
    case "/terms":
      return "terms";
    case "/about":
      return "about";
    case "/contact":
      return "contact";
    default:
      return "comparator";
  }
}

const PAGE_PATH: Record<PageKey, string> = {
  comparator: "/",
  chart: "/chart",
  map: "/map",
  sun: "/sun",
  alerts: "/alerts",
  weather: "/weather",
  currency: "/currency",
  news: "/news",
  flights: "/flights",
  privacy: "/privacy",
  terms: "/terms",
  about: "/about",
  contact: "/contact",
};

/**
 * Discreet breadcrumb below the header, with a matching BreadcrumbList
 * JSON-LD block for SEO. Updates per route (client-side, since the root
 * layout — where this is mounted — doesn't otherwise know which page is
 * active).
 */
export default function Breadcrumb({ locale }: BreadcrumbProps) {
  const t = useTranslations("Breadcrumb");
  const pathname = usePathname();
  const pageKey = pageKeyFromPathname(pathname);
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
        name: t(pageKey),
        item: `${siteUrl}/${locale}${PAGE_PATH[pageKey]}`,
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
          {t(pageKey)}
        </li>
      </ol>
    </nav>
  );
}
