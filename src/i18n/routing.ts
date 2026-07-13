import { defineRouting } from "next-intl/routing";

/** The 6 locales supported by the app, path-prefixed for SEO (e.g. /en, /pt). */
export const locales = ["en", "pt", "es", "fr", "de", "hi"] as const;

export type AppLocale = (typeof locales)[number];

/** Native display names, used by the language switcher. */
export const localeNames: Record<AppLocale, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  hi: "हिन्दी",
};

/** ISO 3166-1 alpha-2 country used to render a flag for each locale in the switcher. */
export const localeCountryCode: Record<AppLocale, string> = {
  en: "US",
  pt: "BR",
  es: "ES",
  fr: "FR",
  de: "DE",
  hi: "IN",
};

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
});
