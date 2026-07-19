import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  // sitemap.ts partitions one file per locale via generateSitemaps, which
  // Next.js only serves at /sitemap/[id].xml — there's no automatic
  // combined index at /sitemap.xml (that path 404s once generateSitemaps
  // is used). robots.txt supports multiple `Sitemap:` directives per the
  // protocol (https://www.sitemaps.org/protocol.html#index), so every
  // partition is listed directly here instead of pointing at a
  // non-existent index.
  const sitemaps = locales.map((_, id) => `${base}/sitemap/${id}.xml`);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: sitemaps,
  };
}
