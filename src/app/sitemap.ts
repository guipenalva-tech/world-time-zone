import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/siteUrl";

/** The 4 legal pages added this sprint (AdSense prerequisites) — indexable
 * on purpose (no noindex), unlike nothing else new here. */
const LEGAL_PAGES = ["privacy", "terms", "about", "contact"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, `${base}/${locale}`]),
  );

  const homeEntries: MetadataRoute.Sitemap = locales.map((locale) => ({
    url: `${base}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: locale === "en" ? 1 : 0.8,
    alternates: { languages },
  }));

  const legalEntries: MetadataRoute.Sitemap = LEGAL_PAGES.flatMap((page) => {
    const pageLanguages = Object.fromEntries(
      locales.map((locale) => [locale, `${base}/${locale}/${page}`]),
    );
    return locales.map((locale) => ({
      url: `${base}/${locale}/${page}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
      alternates: { languages: pageLanguages },
    }));
  });

  return [...homeEntries, ...legalEntries];
}
