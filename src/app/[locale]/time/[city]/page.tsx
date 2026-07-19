import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locales } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { cities, getCityById } from "@/lib/cities";
import { buildCityFacts } from "@/lib/cityFacts";
import {
  buildCityNarrative,
  type NarrativeSentence,
} from "@/lib/cityNarrative";
import { formatLocalizedDate, toLuxonLocale } from "@/lib/timezone";
import { defaultHourFormat, type HourFormat } from "@/stores/settingsStore";
import { getFlagEmoji } from "@/lib/flags";
import { getSiteUrl } from "@/lib/siteUrl";
import { getLocalizedCityName, getLocalizedCountryName } from "@/lib/i18nNames";
import type { City } from "@/types/city";
import LazySection from "@/components/Home/LazySection";
import AdBanner from "@/components/Ads/AdBanner";
import CityClock from "@/components/CityPage/CityClock";
import CityWeatherWidget from "@/components/CityPage/CityWeatherWidget";
import CityCurrencyWidget from "@/components/CityPage/CityCurrencyWidget";

/** Top cities (by population) pre-rendered at build time for every
 * locale (~40 x 11 = ~440 pages). Everything else renders on first
 * request and is cached by ISR (see `revalidate` below) — 477 x 11
 * (5,247 total routes) would make the build itself far too slow. */
const TOP_CITY_COUNT = 40;

/** Re-computed hourly: DST-transition countdowns, sunrise/sunset "today",
 * and reference-city diffs all depend on the current instant, so a
 * cached page older than this is allowed to go stale and regenerate. */
export const revalidate = 3600;
export const dynamicParams = true;

interface CityPageParams {
  locale: string;
  city: string;
}

export function generateStaticParams() {
  const topCities = [...cities]
    .sort((a, b) => b.population - a.population)
    .slice(0, TOP_CITY_COUNT);
  return topCities.map((c) => ({ city: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<CityPageParams>;
}): Promise<Metadata> {
  const { locale, city: citySlug } = await params;
  if (!hasLocale(locales, locale)) return {};
  const city = getCityById(citySlug);
  if (!city) return {};

  const facts = buildCityFacts(city);
  const t = await getTranslations({ locale, namespace: "CityPage" });
  const cityName = getLocalizedCityName(city, locale);
  const countryName = getLocalizedCountryName(city.countryCode, locale, city.country);
  const title = t("metaTitle", {
    city: cityName,
    offset: facts.zoneInfo.offsetFormatted,
    abbreviation: facts.zoneInfo.abbreviation,
  });
  const description = t("metaDescription", {
    city: cityName,
    country: countryName,
    offset: facts.zoneInfo.offsetFormatted,
    abbreviation: facts.zoneInfo.abbreviation,
  });

  const path = `/time/${city.id}`;
  const languages: Record<string, string> = Object.fromEntries(
    locales.map((l) => [l, `/${l}${path}`]),
  );
  languages["x-default"] = `/en${path}`;

  return {
    title,
    description,
    alternates: { canonical: `/${locale}${path}`, languages },
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      siteName: "World Time Zone",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function formatTime(dt: DateTime, hourFormat: HourFormat): string {
  return dt.isValid
    ? dt.toFormat(hourFormat === "24" ? "HH:mm" : "h:mm a")
    : "—";
}

/** City-id-valued keys emitted by cityNarrative.ts, mapped to the ICU
 * param name the message template actually expects. Resolved to a
 * locale-specific display name here rather than in cityNarrative.ts,
 * which has no `locale` to work with (see that file's header comment). */
const NARRATIVE_CITY_ID_KEYS: Record<string, string> = {
  cityId: "city",
  refCityId: "refCity",
  contrastCityId: "contrastCity",
};

/** Resolves a narrative sentence's values for interpolation:
 * - `hemisphereKey` (a translation key name chosen by cityNarrative.ts,
 *   e.g. "hemisphereNorthWord") is swapped for the actual translated word
 *   under the `hemisphere` param the message template expects.
 * - `cityId`/`refCityId`/`contrastCityId` (city.id values) are resolved
 *   to locale-appropriate display names via `getLocalizedCityName`.
 * - `countryCode` (paired with an English-fallback `country`) is resolved
 *   to a locale-appropriate country name via `getLocalizedCountryName`.
 * Every other value passes through unchanged. */
function resolveNarrativeValues(
  t: (key: string, values?: Record<string, string | number>) => string,
  values: NarrativeSentence["values"],
  locale: string,
): Record<string, string | number> {
  const result: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(values)) {
    if (key === "hemisphereKey" && typeof value === "string") {
      result.hemisphere = t(value);
    } else if (key in NARRATIVE_CITY_ID_KEYS && typeof value === "string") {
      const refCity = getCityById(value);
      result[NARRATIVE_CITY_ID_KEYS[key]] = refCity
        ? getLocalizedCityName(refCity, locale)
        : value;
    } else if (key === "countryCode") {
      // Handled together with `country` below; skip here.
      continue;
    } else {
      result[key] = value;
    }
  }

  if (typeof values.countryCode === "string") {
    const fallback = typeof values.country === "string" ? values.country : "";
    result.country = getLocalizedCountryName(values.countryCode, locale, fallback);
  }

  return result;
}

export default async function CityTimePage({
  params,
}: {
  params: Promise<CityPageParams>;
}) {
  const { locale, city: citySlug } = await params;
  if (!hasLocale(locales, locale)) notFound();
  const city = getCityById(citySlug);
  if (!city) notFound();

  const now = DateTime.utc();
  const facts = buildCityFacts(city, now);
  const narrativeSentences = buildCityNarrative(facts);

  const [t, tSun, tAlerts, tFlights] = await Promise.all([
    getTranslations({ locale, namespace: "CityPage" }),
    getTranslations({ locale, namespace: "Sun" }),
    getTranslations({ locale, namespace: "Alerts" }),
    getTranslations({ locale, namespace: "Flights" }),
  ]);

  const luxonLocale = toLuxonLocale(locale);
  const hourFormat = defaultHourFormat(locale);
  const siteUrl = getSiteUrl();
  const zonedNow = now.setZone(city.timezone).setLocale(luxonLocale);
  const numberFormat = new Intl.NumberFormat(locale);
  const priceFormat = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  // Localized display names, computed once and reused everywhere the city's
  // (or a related city's) name/country needs to appear on the page — see
  // src/lib/i18nNames.ts for the country (Intl.DisplayNames) vs. city
  // (curated src/data/cityNames.json) resolution strategies.
  const cityName = getLocalizedCityName(city, locale);
  const countryName = getLocalizedCountryName(city.countryCode, locale, city.country);
  const localizedCityName = (c: City) => getLocalizedCityName(c, locale);

  const narrativeText = narrativeSentences.map((s) =>
    t(s.key, resolveNarrativeValues(t, s.values, locale)),
  );

  // --- Sun section ---------------------------------------------------
  const sunrise =
    facts.sun.sunrise?.setZone(city.timezone).setLocale(luxonLocale) ?? null;
  const sunset =
    facts.sun.sunset?.setZone(city.timezone).setLocale(luxonLocale) ?? null;
  const dayLenTotalMin = Math.round(facts.sun.dayLengthMinutes);
  const dayLenHours = Math.floor(dayLenTotalMin / 60);
  const dayLenMinutes = dayLenTotalMin % 60;

  // --- FAQ (also drives the FAQPage JSON-LD below) --------------------
  const faqItems: { question: string; answer: string }[] = [];
  faqItems.push({
    question: t("faqQ1", { city: cityName }),
    answer: t("faqA1", {
      time: formatTime(zonedNow, hourFormat),
      date: formatLocalizedDate(
        zonedNow,
        { day: "numeric", month: "long", year: "numeric" },
        "d MMMM yyyy",
      ),
      city: cityName,
      offset: facts.zoneInfo.offsetFormatted,
    }),
  });
  faqItems.push({
    question: t("faqQ2", { city: cityName }),
    answer: facts.dstTransition
      ? t("faqA2Yes", { city: cityName })
      : t("faqA2No", {
          city: cityName,
          offset: facts.zoneInfo.offsetFormatted,
        }),
  });
  const primaryDiff = facts.referenceCities.find(
    (r) => r.city.id === facts.primaryReference?.id,
  );
  if (primaryDiff && facts.primaryReference) {
    const primaryReferenceName = localizedCityName(facts.primaryReference);
    const diffValues = {
      city: cityName,
      refCity: primaryReferenceName,
      hours: primaryDiff.diffHoursAbs,
      minutes: primaryDiff.diffMinutesAbs,
    };
    faqItems.push({
      question: t("faqQ3", {
        city: cityName,
        refCity: primaryReferenceName,
      }),
      answer:
        primaryDiff.direction === "same"
          ? t("faqA3Same", {
              city: cityName,
              refCity: primaryReferenceName,
            })
          : primaryDiff.direction === "ahead"
            ? t("faqA3Ahead", diffValues)
            : t("faqA3Behind", diffValues),
    });
  }
  faqItems.push({
    question: t("faqQ4", { city: cityName }),
    answer: t("faqA4", {
      city: cityName,
      offset: facts.zoneInfo.offsetFormatted,
      abbreviation: facts.zoneInfo.abbreviation,
    }),
  });
  faqItems.push({
    question: t("faqQ5", { city: cityName }),
    answer:
      facts.sun.daylightState === "alwaysAbove"
        ? t("faqA5Midnight", { city: cityName })
        : facts.sun.daylightState === "alwaysBelow"
          ? t("faqA5Polar", { city: cityName })
          : t("faqA5", {
              city: cityName,
              sunrise: sunrise ? formatTime(sunrise, hourFormat) : "—",
              sunset: sunset ? formatTime(sunset, hourFormat) : "—",
            }),
  });
  faqItems.push({
    question: t("faqQ6", { city: cityName }),
    answer: t("faqA6", {
      city: cityName,
      population: numberFormat.format(city.population),
    }),
  });

  // --- JSON-LD -----------------------------------------------------------
  // Note: BreadcrumbList is intentionally NOT duplicated here — the
  // globally-mounted <Breadcrumb> (src/components/Layout/Breadcrumb.tsx)
  // already emits one for every route, including this one (it has its
  // own /time/[city] case). A second identical BreadcrumbList block would
  // just be confusing duplicate structured data for crawlers.
  const pageUrl = `${siteUrl}/${locale}/time/${city.id}`;
  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "City",
    name: cityName,
    address: { "@type": "PostalAddress", addressCountry: city.countryCode },
    geo: { "@type": "GeoCoordinates", latitude: city.lat, longitude: city.lon },
    url: pageUrl,
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 pb-24 pt-6 sm:px-6">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* 1. H1 + live clock */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-2xl">
            {getFlagEmoji(city.countryCode)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold sm:text-3xl">
              {t("heading", { city: cityName })}
            </h1>
            <p className="truncate text-sm text-foreground/60">
              {countryName} · {facts.zoneInfo.offsetFormatted} (
              {facts.zoneInfo.abbreviation})
            </p>
          </div>
        </div>
        <CityClock
          timezone={city.timezone}
          initialIso={now.toISO() ?? now.toString()}
        />
      </header>

      {/* 2. DST block */}
      <section
        aria-labelledby="cp-dst-heading"
        className="rounded-xl border border-border bg-surface/40 p-4"
      >
        <h2 id="cp-dst-heading" className="mb-2 text-lg font-semibold">
          {t("dstHeading")}
        </h2>
        {facts.dstTransition ? (
          <div className="flex flex-col gap-1 text-sm">
            <p>{t("dstObservesIntro", { city: cityName })}</p>
            <p className="text-foreground/70">
              {t("dstNextTransition", {
                change: tAlerts(
                  facts.dstTransition.direction === "forward"
                    ? "dst.springForward"
                    : "dst.fallBack",
                ),
                when: tAlerts("dst.at", {
                  date: formatLocalizedDate(
                    facts.dstTransition.at
                      .setZone(city.timezone)
                      .setLocale(luxonLocale),
                    { day: "numeric", month: "long" },
                    "d MMMM",
                  ),
                  time: formatTime(
                    facts.dstTransition.at
                      .setZone(city.timezone)
                      .setLocale(luxonLocale),
                    hourFormat,
                  ),
                }),
              })}
            </p>
          </div>
        ) : (
          <p className="text-sm">
            {t("dstNotObserved", {
              city: cityName,
              offset: facts.zoneInfo.offsetFormatted,
            })}
          </p>
        )}
      </section>

      {/* 3. Sun today */}
      <section
        aria-labelledby="cp-sun-heading"
        className="rounded-xl border border-border bg-surface/40 p-4"
      >
        <h2 id="cp-sun-heading" className="mb-3 text-lg font-semibold">
          {tSun("pageTitle")}
        </h2>
        {facts.sun.daylightState === "alwaysAbove" ? (
          <p className="text-sm">{tSun("sunNeverSets")}</p>
        ) : facts.sun.daylightState === "alwaysBelow" ? (
          <p className="text-sm">{tSun("sunNeverRises")}</p>
        ) : (
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-foreground/50">{tSun("sunrise")}</dt>
              <dd className="font-medium tabular-nums">
                {sunrise ? formatTime(sunrise, hourFormat) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-foreground/50">{tSun("sunset")}</dt>
              <dd className="font-medium tabular-nums">
                {sunset ? formatTime(sunset, hourFormat) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-foreground/50">
                {tSun("dayLength")}
              </dt>
              <dd className="font-medium tabular-nums">
                {tSun("dayLengthValue", {
                  hours: dayLenHours,
                  minutes: dayLenMinutes,
                })}
              </dd>
            </div>
          </dl>
        )}
      </section>

      {/* 10. Narrative paragraph */}
      {narrativeText.length > 0 && (
        <section
          aria-labelledby="cp-narrative-heading"
          className="rounded-xl border border-border bg-surface/40 p-4"
        >
          <h2 id="cp-narrative-heading" className="sr-only">
            {cityName}
          </h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            {narrativeText.join(" ")}
          </p>
        </section>
      )}

      {/* 4 + 5. Diff table + meeting window */}
      <section
        aria-labelledby="cp-diff-heading"
        className="rounded-xl border border-border bg-surface/40 p-4"
      >
        <h2 id="cp-diff-heading" className="mb-3 text-lg font-semibold">
          {t("diffHeading")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-foreground/50">
                <th className="py-1.5 pr-2 font-medium">
                  {t("diffTableCity")}
                </th>
                <th className="py-1.5 pr-2 font-medium">
                  {t("diffTableLocalTime")}
                </th>
                <th className="py-1.5 pr-2 font-medium">
                  {t("diffTableDifference")}
                </th>
              </tr>
            </thead>
            <tbody>
              {facts.referenceCities.map((ref) => {
                const refZoned = now
                  .setZone(ref.city.timezone)
                  .setLocale(luxonLocale);
                return (
                  <tr key={ref.city.id} className="border-t border-border">
                    <td className="py-1.5 pr-2">
                      <Link
                        href={`/time/${ref.city.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {getFlagEmoji(ref.city.countryCode)}{" "}
                        {localizedCityName(ref.city)}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {formatTime(refZoned, hourFormat)}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {ref.direction === "same"
                        ? t("diffSameValue")
                        : t(
                            ref.direction === "ahead"
                              ? "diffAheadValue"
                              : "diffBehindValue",
                            {
                              hours: ref.diffHoursAbs,
                              minutes: ref.diffMinutesAbs,
                            },
                          )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-labelledby="cp-meeting-heading"
        className="rounded-xl border border-border bg-surface/40 p-4"
      >
        <h2 id="cp-meeting-heading" className="mb-1 text-lg font-semibold">
          {t("meetingHeading")}
        </h2>
        <p className="mb-3 text-xs text-foreground/50">
          {t("meetingSubtitle", { city: cityName })}
        </p>
        <ul className="flex flex-col gap-2 text-sm">
          {facts.referenceCities.map((ref) => {
            const overlapH = Math.floor(ref.meetingOverlapMinutes / 60);
            const overlapM = ref.meetingOverlapMinutes % 60;
            const noOverlap = ref.meetingOverlapMinutes === 0;
            return (
              <li
                key={ref.city.id}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  {getFlagEmoji(ref.city.countryCode)} {localizedCityName(ref.city)}
                </span>
                <span
                  className={
                    noOverlap
                      ? "font-medium text-warning"
                      : "text-foreground/70"
                  }
                >
                  {noOverlap
                    ? t("meetingNoOverlap")
                    : t("meetingOverlapValue", {
                        hours: overlapH,
                        minutes: overlapM,
                      })}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 6. Weather (lazy, client) */}
      <section
        aria-labelledby="cp-weather-heading"
        className="rounded-xl border border-border bg-surface/40 p-4"
      >
        <h2 id="cp-weather-heading" className="mb-3 text-lg font-semibold">
          {t("weatherHeading")}
        </h2>
        <LazySection minHeightClassName="min-h-[220px]">
          <CityWeatherWidget lat={city.lat} lon={city.lon} locale={locale} />
        </LazySection>
      </section>

      {/* 7. Currency (lazy, client) */}
      <section
        aria-labelledby="cp-currency-heading"
        className="rounded-xl border border-border bg-surface/40 p-4"
      >
        <h2 id="cp-currency-heading" className="mb-3 text-lg font-semibold">
          {t("currencyHeading")}
        </h2>
        <LazySection minHeightClassName="min-h-[80px]">
          <CityCurrencyWidget
            currency={facts.currencyCode}
            cityName={cityName}
            locale={locale}
          />
        </LazySection>
      </section>

      {/* 8. Flights */}
      <section
        aria-labelledby="cp-flights-heading"
        className="rounded-xl border border-border bg-surface/40 p-4"
      >
        <h2 id="cp-flights-heading" className="mb-1 text-lg font-semibold">
          {t("flightsHeading")}
        </h2>
        <p className="mb-3 text-xs text-foreground/50">
          {tFlights("disclaimerText")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-foreground/50">
                <th className="py-1.5 pr-2 font-medium">
                  {t("flightsTableHub")}
                </th>
                <th className="py-1.5 pr-2 font-medium">
                  {t("flightsTableDistance")}
                </th>
                <th className="py-1.5 pr-2 font-medium">
                  {t("flightsTableDuration")}
                </th>
                <th className="py-1.5 pr-2 font-medium">
                  {t("flightsTablePrice")}
                </th>
              </tr>
            </thead>
            <tbody>
              {facts.flights.map((row) => (
                <tr key={row.hub.id} className="border-t border-border">
                  <td className="py-1.5 pr-2">
                    <Link
                      href={`/time/${row.hub.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {getFlagEmoji(row.hub.countryCode)} {localizedCityName(row.hub)}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {tFlights("distanceKm", { km: numberFormat.format(row.distanceKm) })}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {tFlights("durationValue", {
                      hours: Math.floor(row.durationMinutes / 60),
                      minutes: row.durationMinutes % 60,
                    })}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {priceFormat.format(row.priceMinUsd)}–{priceFormat.format(row.priceMaxUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdBanner slot="infeed" />

      {/* 9. Related cities */}
      {(facts.sameTimezoneCities.length > 0 ||
        facts.sameCountryCities.length > 0) && (
        <section
          aria-labelledby="cp-related-heading"
          className="rounded-xl border border-border bg-surface/40 p-4"
        >
          <h2 id="cp-related-heading" className="mb-3 text-lg font-semibold">
            {t("relatedHeading")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {facts.sameTimezoneCities.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-foreground/60">
                  {t("relatedSameZone", { timezone: city.timezone })}
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {facts.sameTimezoneCities.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/time/${c.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {getFlagEmoji(c.countryCode)} {localizedCityName(c)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {facts.sameCountryCities.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-foreground/60">
                  {t("relatedSameCountry", { country: countryName })}
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {facts.sameCountryCities.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/time/${c.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {getFlagEmoji(c.countryCode)} {localizedCityName(c)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 11. FAQ */}
      <section
        aria-labelledby="cp-faq-heading"
        className="rounded-xl border border-border bg-surface/40 p-4"
      >
        <h2 id="cp-faq-heading" className="mb-3 text-lg font-semibold">
          {t("faqHeading")}
        </h2>
        <div className="flex flex-col divide-y divide-border">
          {faqItems.map((item, i) => (
            <details key={i} className="group py-3 first:pt-0 last:pb-0">
              <summary className="cursor-pointer list-none text-sm font-medium marker:content-none">
                {item.question}
              </summary>
              <p className="mt-2 text-sm text-foreground/70">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
