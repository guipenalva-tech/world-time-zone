import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type AppLocale } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/siteUrl";
import Header from "@/components/Layout/Header";
import Breadcrumb from "@/components/Layout/Breadcrumb";
import StoreHydrator from "@/components/App/StoreHydrator";
import ThemeSync from "@/components/App/ThemeSync";
import "../globals.css";

/**
 * Runs before hydration to apply any explicit light/dark override stored by
 * settingsStore, so the first paint already matches it (no flash). "system"
 * leaves the attribute unset, falling back to the `prefers-color-scheme`
 * rules in globals.css. Kept in sync with the "wtz-settings" persist key
 * and zustand's persist storage shape (`{ state: { theme } }`).
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem("wtz-settings");
    var theme = raw ? (JSON.parse(raw).state || {}).theme : null;
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {}
})();
`;

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** BCP-47 / OG-style locale tags, e.g. "pt" -> "pt_BR" for Open Graph. */
const OG_LOCALES: Record<AppLocale, string> = {
  en: "en_US",
  pt: "pt_BR",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
  hi: "hi_IN",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const siteUrl = getSiteUrl();

  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}`]),
  ) as Record<AppLocale, string>;

  const title = t("title");
  const description = t("description");
  const ogLocale = OG_LOCALES[locale as AppLocale] ?? OG_LOCALES.en;
  const alternateLocales = locales
    .filter((l) => l !== locale)
    .map((l) => OG_LOCALES[l]);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages,
    },
    openGraph: {
      title,
      description,
      url: `/${locale}`,
      siteName: "World Time Zone",
      locale: ogLocale,
      alternateLocale: alternateLocales,
      type: "website",
      images: [
        {
          url: "/og/default.png",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og/default.png"],
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Metadata" });
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "World Time Zone",
    description: t("description"),
    url: `${siteUrl}/${locale}`,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The beforeInteractive theme-init script (below) sets data-theme on
      // this element before hydration to avoid a flash, which intentionally
      // differs from the server-rendered markup — expected, not a bug.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* TODO(consent): gate this behind an LGPD/GDPR consent banner once
            the deploy sprint adds one — AdSense personalized ads should not
            fire before consent is collected in applicable regions. */}
        {ADSENSE_CLIENT && (
          <Script
            id="adsbygoogle-init"
            strategy="lazyOnload"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        <NextIntlClientProvider>
          <StoreHydrator />
          <ThemeSync />
          <Header />
          <Breadcrumb locale={locale as AppLocale} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
