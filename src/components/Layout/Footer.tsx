"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useConsentStore } from "@/stores/consentStore";
import { getPopularCities } from "@/lib/cities";
import { getLocalizedCityName } from "@/lib/i18nNames";
import LanguageSelect from "@/components/Settings/LanguageSelect";

/** Sitewide internal links to the highest-population /time/[city] pages —
 * present in every page's footer (not just the home page) so crawlers can
 * discover the city pages from anywhere on the site, and so real visitors
 * have an obvious path into them too. */
const POPULAR_CITIES = getPopularCities(12);

/**
 * Global footer: legal-page links (AdSense prerequisite), product name +
 * current year, and a "Cookie preferences" control that reopens the
 * consent banner (`useConsentStore.openPreferences`) so a visitor can
 * change their choice at any time, per LGPD/GDPR.
 *
 * Rendered once in the root layout, after `{children}` — every page's
 * content area uses `flex-1` (see e.g. `WeatherView`), so on short pages
 * this footer is pushed to the bottom of the viewport via `body`'s own
 * `flex flex-col`; on long pages it simply follows the content. It does
 * NOT include an ad slot: the existing `AdBanner slot="bottom"` lives
 * inside the Comparator (top of the home page) and is left untouched.
 */
export default function Footer() {
  const t = useTranslations("Footer");
  const locale = useLocale();
  const openPreferences = useConsentStore((s) => s.openPreferences);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <nav aria-label={t("popularCitiesHeading")}>
          <p className="mb-1.5 text-xs font-semibold text-foreground/70">
            {t("popularCitiesHeading")}
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
            {POPULAR_CITIES.map((city) => (
              <li key={city.id}>
                <Link
                  href={`/time/${city.id}`}
                  className="text-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
                >
                  {getLocalizedCityName(city, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 max-w-sm">
          <p className="text-sm font-semibold text-foreground">
            {t("product")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/60">
            {t("tagline")}
          </p>
          <p className="mt-2 text-xs text-foreground/50">
            {t("rights", { year })}
          </p>
        </div>

        <nav
          aria-label={t("legalHeading")}
          className="flex flex-col gap-3 sm:flex-row sm:gap-6"
        >
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <li>
              <Link
                href="/about"
                className="text-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                {t("about")}
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="text-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="text-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                {t("contact")}
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={openPreferences}
                className="text-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                {t("cookiePreferences")}
              </button>
            </li>
          </ul>

          <div className="flex items-center gap-2">
            <span className="sr-only">{t("languageLabel")}</span>
            <LanguageSelect />
          </div>
        </nav>
      </div>
    </footer>
  );
}
