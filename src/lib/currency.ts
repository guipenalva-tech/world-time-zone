/**
 * Currency conversion, backed by the free Frankfurter API (ECB reference
 * rates, no API key). Two independent concerns live here:
 *
 * 1. `COUNTRY_CURRENCY`: a static ISO 3166-1 alpha-2 -> ISO 4217 map
 *    covering every country code present in src/data/cities.json, so any
 *    compared city can be resolved to "its" currency.
 * 2. `fetchExchangeRates`: talks to the API and caches responses briefly.
 *
 * Frankfurter only mirrors the ECB's ~30 reference currencies (no ARS,
 * AED, CUP, KPW, etc.) — most of the world's currencies are simply not
 * available from this source. Callers must treat "not present in the
 * fetched rates" as an expected, non-error outcome (see CurrencyCard),
 * not something to retry or fail loudly on.
 */

/** ISO 3166-1 alpha-2 country code -> ISO 4217 currency code. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  AD: "EUR", AE: "AED", AF: "AFN", AL: "ALL", AM: "AMD", AO: "AOA",
  AR: "ARS", AS: "USD", AT: "EUR", AU: "AUD", AW: "AWG", AZ: "AZN",
  BA: "BAM", BB: "BBD", BD: "BDT", BE: "EUR", BF: "XOF", BG: "BGN",
  BH: "BHD", BI: "BIF", BN: "BND", BO: "BOB", BR: "BRL", BS: "BSD",
  BT: "BTN", BW: "BWP", BY: "BYN", CA: "CAD", CD: "CDF", CF: "XAF",
  CG: "XAF", CH: "CHF", CI: "XOF", CK: "NZD", CL: "CLP", CM: "XAF",
  CN: "CNY", CO: "COP", CR: "CRC", CU: "CUP", CV: "CVE", CW: "ANG",
  CY: "EUR", CZ: "CZK", DE: "EUR", DJ: "DJF", DK: "DKK", DO: "DOP",
  DZ: "DZD", EC: "USD", EE: "EUR", EG: "EGP", ER: "ERN", ES: "EUR",
  ET: "ETB", FI: "EUR", FJ: "FJD", FM: "USD", FO: "DKK", FR: "EUR",
  GA: "XAF", GB: "GBP", GD: "XCD", GE: "GEL", GH: "GHS", GI: "GIP",
  GL: "DKK", GN: "GNF", GQ: "XAF", GR: "EUR", GT: "GTQ", GU: "USD",
  GY: "GYD", HK: "HKD", HN: "HNL", HR: "EUR", HT: "HTG", HU: "HUF",
  ID: "IDR", IE: "EUR", IL: "ILS", IN: "INR", IQ: "IQD", IR: "IRR",
  IS: "ISK", IT: "EUR", JM: "JMD", JO: "JOD", JP: "JPY", KE: "KES",
  KG: "KGS", KH: "KHR", KI: "AUD", KP: "KPW", KR: "KRW", KW: "KWD",
  KY: "KYD", KZ: "KZT", LA: "LAK", LB: "LBP", LC: "XCD", LK: "LKR",
  LR: "LRD", LT: "EUR", LU: "EUR", LV: "EUR", LY: "LYD", MA: "MAD",
  MD: "MDL", ME: "EUR", MG: "MGA", MH: "USD", MK: "MKD", ML: "XOF",
  MM: "MMK", MN: "MNT", MO: "MOP", MP: "USD", MR: "MRU", MT: "EUR",
  MU: "MUR", MV: "MVR", MX: "MXN", MY: "MYR", MZ: "MZN", NA: "NAD",
  NC: "XPF", NE: "XOF", NG: "NGN", NI: "NIO", NL: "EUR", NO: "NOK",
  NP: "NPR", NR: "AUD", NU: "NZD", NZ: "NZD", OM: "OMR", PA: "PAB",
  PE: "PEN", PF: "XPF", PG: "PGK", PH: "PHP", PK: "PKR", PL: "PLN",
  PR: "USD", PT: "EUR", PW: "USD", PY: "PYG", QA: "QAR", RO: "RON",
  RS: "RSD", RU: "RUB", RW: "RWF", SA: "SAR", SB: "SBD", SD: "SDG",
  SE: "SEK", SG: "SGD", SI: "EUR", SK: "EUR", SL: "SLE", SN: "XOF",
  SO: "SOS", SR: "SRD", ST: "STN", SV: "USD", SY: "SYP", TD: "XAF",
  TH: "THB", TJ: "TJS", TL: "USD", TM: "TMT", TN: "TND", TO: "TOP",
  TR: "TRY", TT: "TTD", TV: "AUD", TW: "TWD", TZ: "TZS", UA: "UAH",
  UG: "UGX", US: "USD", UY: "UYU", UZ: "UZS", VE: "VES", VG: "USD",
  VN: "VND", VU: "VUV", WS: "WST", YE: "YER", ZA: "ZAR", ZM: "ZMW",
  ZW: "ZWL",
};

/** Resolves a city's currency from its ISO country code. */
export function getCurrencyForCountry(countryCode: string): string | undefined {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()];
}

export interface ExchangeRates {
  base: string;
  /** ECB reference date for these rates, e.g. "2026-07-11" (ISO date). */
  date: string;
  /** Target currency code -> units per 1 unit of `base`. Does not include `base` itself. */
  rates: Record<string, number>;
}

interface CacheEntry {
  fetchedAt: number;
  data: ExchangeRates;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const rateCache = new Map<string, CacheEntry>();

/**
 * Fetches latest exchange rates for `baseCurrency` from the Frankfurter
 * API (https://api.frankfurter.dev — free, no key, ECB reference data).
 * Results are cached in memory per base currency for a few minutes so
 * repeated renders / quick base-switching don't refetch every time.
 *
 * Throws on network failure or if the base currency itself isn't one of
 * Frankfurter's supported currencies (its `/latest` endpoint 4xx's in
 * that case) — callers should catch this and show a page-level error,
 * since without a valid base there's nothing to convert.
 */
export async function fetchExchangeRates(baseCurrency: string): Promise<ExchangeRates> {
  const base = baseCurrency.toUpperCase();
  const cached = rateCache.get(base);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(
    `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}`,
  );
  if (!res.ok) {
    throw new Error(`Frankfurter API error (${res.status}) for base ${base}`);
  }
  const json = (await res.json()) as { amount: number; base: string; date: string; rates: Record<string, number> };

  const data: ExchangeRates = { base: json.base, date: json.date, rates: json.rates };
  rateCache.set(base, { fetchedAt: Date.now(), data });
  return data;
}

/**
 * Converts `amount` units of `base` into `targetCurrency`.
 * Returns null if `targetCurrency` isn't present in `rates` (unsupported
 * by Frankfurter) and isn't the base itself.
 */
export function convertAmount(
  amount: number,
  targetCurrency: string,
  rates: ExchangeRates,
): number | null {
  if (targetCurrency === rates.base) return amount;
  const rate = rates.rates[targetCurrency];
  if (rate === undefined) return null;
  return amount * rate;
}
