import { defineRouting } from "next-intl/routing";

/** The 11 locales supported by the app, path-prefixed for SEO (e.g. /en, /pt). */
export const locales = [
  "en",
  "pt",
  "es",
  "fr",
  "de",
  "hi",
  "it",
  "ru",
  "zh-CN",
  "zh-TW",
  "ja",
] as const;

export type AppLocale = (typeof locales)[number];

/** Native display names, used by the language switcher. */
export const localeNames: Record<AppLocale, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  hi: "हिन्दी",
  it: "Italiano",
  ru: "Русский",
  "zh-CN": "中文(简体)",
  "zh-TW": "中文(繁體)",
  ja: "日本語",
};

/** ISO 3166-1 alpha-2 country used to render a flag for each locale in the switcher. */
export const localeCountryCode: Record<AppLocale, string> = {
  en: "US",
  pt: "BR",
  es: "ES",
  fr: "FR",
  de: "DE",
  hi: "IN",
  it: "IT",
  ru: "RU",
  "zh-CN": "CN",
  "zh-TW": "TW",
  ja: "JP",
};

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
});
