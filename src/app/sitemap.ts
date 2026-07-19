import type { MetadataRoute } from "next";
import { locales, type AppLocale } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/siteUrl";
import { cities } from "@/lib/cities";

/** The 4 legal pages added earlier this project (AdSense prerequisites) —
 * indexable on purpose (no noindex), unlike nothing else new here. */
const LEGAL_PAGES = ["privacy", "terms", "about", "contact"] as const;

/**
 * Sitemap index, partitioned one file per locale (`generateSitemaps` makes
 * Next.js serve `/sitemap.xml` as an index that points at `/sitemap/0.xml`,
 * `/sitemap/1.xml`, ... one per id returned here — see
 * https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps).
 *
 * The 477 city pages x 11 locales this sprint added (5,247 URLs) would
 * still fit in a single 50,000-URL file, so partitioning isn't strictly
 * required by the size limit yet — but per-locale partitioning is also
 * the natural boundary (each file's `alternates.languages` already has to
 * repeat every locale's URL for hreflang, so splitting along that same
 * axis costs nothing) and leaves headroom as more content is added.
 * Each partition holds 1 home + 4 legal + 477 city = 482 URLs.
 */
export async function generateSitemaps() {
  return locales.map((_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const index = Number(await id);
  const locale = (locales[index] ?? locales[0]) as AppLocale;
  const base = getSiteUrl();

  const homeLanguages = Object.fromEntries(locales.map((l) => [l, `${base}/${l}`]));
  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: `${base}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: locale === "en" ? 1 : 0.8,
    alternates: { languages: homeLanguages },
  };

  const legalEntries: MetadataRoute.Sitemap = LEGAL_PAGES.map((page) => {
    const pageLanguages = Object.fromEntries(locales.map((l) => [l, `${base}/${l}/${page}`]));
    return {
      url: `${base}/${locale}/${page}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
      alternates: { languages: pageLanguages },
    };
  });

  const cityEntries: MetadataRoute.Sitemap = cities.map((city) => {
    const cityLanguages = Object.fromEntries(
      locales.map((l) => [l, `${base}/${l}/time/${city.id}`]),
    );
    return {
      url: `${base}/${locale}/time/${city.id}`,
      lastModified: new Date(),
      // Sun/DST/time-diff facts on each city page shift daily.
      changeFrequency: "daily" as const,
      priority: 0.6,
      alternates: { languages: cityLanguages },
    };
  });

  return [homeEntry, ...legalEntries, ...cityEntries];
}
