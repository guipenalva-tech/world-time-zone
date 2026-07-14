import { DateTime } from "luxon";

/**
 * Server-side proxy for Google News RSS (`/api/news`): the feed is XML and
 * blocked by CORS in the browser, so NewsView (client) calls this route
 * instead of fetching Google News directly. No API key, no runtime XML
 * library — the feed shape is simple enough to parse with a handful of
 * regexes (see parseRssItems below).
 *
 * Query params:
 *   country      - English country name (from City.country), used as the
 *                   search subject, e.g. "Japan".
 *   countryCode  - ISO 3166-1 alpha-2 (from City.countryCode), used for the
 *                   feed's regional edition (gl/ceid), e.g. "JP".
 *   locale       - active app locale (one of routing.locales); selects the
 *                   query language and alert keywords. Falls back to "en".
 */

export interface NewsItem {
  title: string;
  link: string;
  /** ISO 8601 instant, or null if the feed's pubDate couldn't be parsed. */
  pubDate: string | null;
  source: string;
}

export interface NewsApiResponse {
  items: NewsItem[];
  fetchedAt: string;
  error?: boolean;
}

/**
 * Per-locale Google News edition metadata and alert-related search terms.
 * `hl` is the UI/interface language, `ceidLang` is the language half of the
 * `ceid` param (occasionally differs from `hl`, e.g. Google uses "pt-419"
 * for Brazilian Portuguese in ceid but "pt-BR" as hl). Keyword lists are a
 * small, non-exhaustive OR-query meant to bias results toward
 * travel/safety-relevant headlines rather than general news.
 */
const LOCALE_NEWS_META: Record<
  string,
  { hl: string; ceidLang: string; keywords: string[] }
> = {
  en: {
    hl: "en-US",
    ceidLang: "en",
    keywords: [
      "travel warning",
      "earthquake",
      "strike",
      "flight disruption",
      "protest",
      "natural disaster",
    ],
  },
  pt: {
    hl: "pt-BR",
    ceidLang: "pt-419",
    keywords: [
      "alerta de viagem",
      "terremoto",
      "greve",
      "transtorno em voos",
      "protesto",
      "desastre natural",
    ],
  },
  es: {
    hl: "es-419",
    ceidLang: "es-419",
    keywords: [
      "alerta de viaje",
      "terremoto",
      "huelga",
      "interrupción de vuelos",
      "protesta",
      "desastre natural",
    ],
  },
  fr: {
    hl: "fr-FR",
    ceidLang: "fr",
    keywords: [
      "alerte de voyage",
      "séisme",
      "grève",
      "perturbation des vols",
      "manifestation",
      "catastrophe naturelle",
    ],
  },
  de: {
    hl: "de-DE",
    ceidLang: "de",
    keywords: [
      "reisewarnung",
      "erdbeben",
      "streik",
      "flugausfälle",
      "protest",
      "naturkatastrophe",
    ],
  },
  hi: {
    hl: "hi-IN",
    ceidLang: "hi",
    keywords: [
      "यात्रा चेतावनी",
      "भूकंप",
      "हड़ताल",
      "उड़ान बाधा",
      "विरोध प्रदर्शन",
      "प्राकृतिक आपदा",
    ],
  },
};

function buildFeedUrl(country: string, countryCode: string, locale: string): string {
  const meta = LOCALE_NEWS_META[locale] ?? LOCALE_NEWS_META.en;
  const query = `(${meta.keywords.join(" OR ")}) ${country}`;
  const params = new URLSearchParams({
    q: query,
    hl: meta.hl,
    gl: countryCode,
    ceid: `${countryCode}:${meta.ceidLang}`,
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

/** Strips any stray HTML (e.g. a leftover <a> from the description field). */
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

function toIso(pubDate: string): string | null {
  if (!pubDate) return null;
  const dt = DateTime.fromRFC2822(pubDate, { zone: "utc" });
  return dt.isValid ? dt.toISO() : null;
}

/**
 * Regex-based RSS parser scoped to the fields Google News actually emits
 * (title, link, pubDate, source) — deliberately not a general XML parser,
 * since we don't want a new runtime dependency for one feed shape.
 */
export function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  for (const block of itemBlocks) {
    const rawTitle = stripHtml(extractTag(block, "title"));
    const link = stripHtml(extractTag(block, "link"));
    if (!rawTitle || !link) continue;

    const pubDate = extractTag(block, "pubDate");
    let source = stripHtml(extractTag(block, "source"));
    let title = rawTitle;

    // Fallback when <source> is missing: Google News titles are typically
    // "Headline - Source Name" — peel the trailing segment off.
    if (!source) {
      const dashIndex = rawTitle.lastIndexOf(" - ");
      if (dashIndex > 0) {
        title = rawTitle.slice(0, dashIndex);
        source = rawTitle.slice(dashIndex + 3);
      }
    } else {
      // <source> was present, but Google News titles usually still carry a
      // trailing "- Source Name" anyway — strip the duplicate for display.
      const suffix = ` - ${source}`;
      if (rawTitle.endsWith(suffix)) {
        title = rawTitle.slice(0, -suffix.length);
      }
    }

    items.push({ title, link, pubDate: toIso(pubDate), source });
  }

  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const countryCode = searchParams.get("countryCode");
  const locale = searchParams.get("locale") ?? "en";

  if (!country || !countryCode) {
    return Response.json(
      { items: [], fetchedAt: new Date().toISOString(), error: true } satisfies NewsApiResponse,
      { status: 400 },
    );
  }

  const feedUrl = buildFeedUrl(country, countryCode.toUpperCase(), locale);

  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WorldTimeZoneBot/1.0; +https://worldtimezone.app)",
      },
      // Google News RSS has no auth and changes slowly enough that a
      // 15-minute shared cache keeps requests low without staling badly.
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      throw new Error(`Google News RSS responded ${res.status}`);
    }

    const xml = await res.text();
    const items = parseRssItems(xml).slice(0, 10);

    return Response.json({
      items,
      fetchedAt: new Date().toISOString(),
    } satisfies NewsApiResponse);
  } catch {
    return Response.json({
      items: [],
      fetchedAt: new Date().toISOString(),
      error: true,
    } satisfies NewsApiResponse);
  }
}
