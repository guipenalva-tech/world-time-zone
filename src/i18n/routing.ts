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

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
});
