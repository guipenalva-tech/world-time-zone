import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type AppLocale } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/siteUrl";
import "../globals.css";

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
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
