/**
 * Absolute base URL for the deployed site, used by SEO surfaces (sitemap,
 * robots, canonical/OG URLs, JSON-LD) that need fully-qualified links. Reads
 * `NEXT_PUBLIC_SITE_URL` (see .env.example), falling back to localhost for
 * local dev so these routes never crash without the env var set.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
