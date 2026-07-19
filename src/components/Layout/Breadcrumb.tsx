"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getSiteUrl } from "@/lib/siteUrl";
import { getCityById } from "@/lib/cities";
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
  | "contact"
  | "time";

/** Every /time/[city] page's URL prefix (locale-stripped). */
const CITY_PATH_PREFIX = "/time/";

/** Maps a (locale-stripped) pathname to the current page's breadcrumb key. */
function pageKeyFromPathname(pathname: string): PageKey {
  if (pathname.startsWith(CITY_PATH_PREFIX)) return "time";
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
  // Not a real listing page (each city has its own URL below) — only used
  // as a plain-text, unlinked middle crumb for /time/[city] pages.
  time: "/time",
};

/**
 * Discreet breadcrumb below the header, with a matching BreadcrumbList
 * JSON-LD block for SEO. Updates per route (client-side, since the root
 * layout — where this is mounted — doesn't otherwise know which page is
 * active).
 *
 * /time/[city] pages get a 3-level *visual* trail (Home > Time Zones >
 * {city name}) but only a 2-level JSON-LD (Home > city URL) — "Time Zones"
 * has no page of its own, and a BreadcrumbList item needs a real URL.
 */
export default function Breadcrumb({ locale }: BreadcrumbProps) {
  const t = useTranslations("Breadcrumb");
  const pathname = usePathname();
  const pageKey = pageKeyFromPathname(pathname);
  const siteUrl = getSiteUrl();

  const isCityPage = pageKey === "time";
  const cityId = isCityPage ? pathname.slice(CITY_PATH_PREFIX.length) : null;
  const city = cityId ? getCityById(cityId) : undefined;
  const currentLabel = isCityPage
    ? (city?.name ?? cityId ?? t(pageKey))
    : t(pageKey);
  const currentHref = isCityPage ? pathname : PAGE_PATH[pageKey];

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
        name: currentLabel,
        item: `${siteUrl}/${locale}${currentHref}`,
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
        {isCityPage && (
          <>
            <li className="text-foreground/50">{t("time")}</li>
            <li aria-hidden="true">›</li>
          </>
        )}
        <li aria-current="page" className="text-foreground/70">
          {currentLabel}
        </li>
      </ol>
    </nav>
  );
}
