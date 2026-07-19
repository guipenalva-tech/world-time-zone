"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useComparatorStore } from "@/stores/comparatorStore";
import { toLuxonLocale } from "@/lib/timezone";
import { getLocalizedCityName } from "@/lib/i18nNames";
import { getCurrencyForCountry, fetchExchangeRates, type ExchangeRates } from "@/lib/currency";
import EmptyCitiesInvite from "@/components/Placeholders/EmptyCitiesInvite";
import AdBanner from "@/components/Ads/AdBanner";
import CurrencyCard from "./CurrencyCard";

const QUICK_AMOUNTS = [1, 10, 100, 1000, 10000];

/**
 * Currency View (/currency): live exchange-rate conversion across the
 * compared cities, via the free Frankfurter API (ECB reference rates).
 * Base currency defaults to the reference (first) city's currency, with
 * a dropdown to switch it among the currencies of the selected cities.
 * Mirrors Chart View's "reference city" pattern but for currency instead
 * of time offset.
 */
interface CurrencyViewProps {
  /** Hides the page-level h1/subtitle when embedded on the home dashboard,
   * which already shows a SectionHeader above this view. Defaults to false
   * so the dedicated /currency page is unchanged. */
  embedded?: boolean;
}

export default function CurrencyView({ embedded = false }: CurrencyViewProps) {
  const locale = useLocale();
  const luxonLocale = toLuxonLocale(locale);
  const t = useTranslations("Currency");
  const cities = useComparatorStore((s) => s.cities);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );

  // Unique currencies among the selected cities, each tagged with the
  // (first, most-relevant) city name to label the dropdown option.
  const baseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of sortedCities) {
      const currency = getCurrencyForCountry(c.city.countryCode);
      if (currency && !seen.has(currency)) {
        seen.set(currency, getLocalizedCityName(c.city, locale));
      }
    }
    return [...seen.entries()].map(([currency, cityName]) => ({ currency, cityName }));
  }, [sortedCities, locale]);

  const referenceCityId = sortedCities[0]?.city.id ?? null;
  const referenceCurrency = sortedCities[0]
    ? getCurrencyForCountry(sortedCities[0].city.countryCode)
    : undefined;

  // Explicit user pick from the dropdown, if any. Cleared whenever the
  // reference (first) city itself changes, so a fresh comparator setup
  // re-anchors to its currency rather than keeping a stale override.
  // Deliberately NOT derived from "is the old base still a valid option" —
  // that check alone can't tell a genuine user choice apart from a base
  // that was auto-picked before the comparator finished hydrating from
  // localStorage (skipHydration: true renders default cities first), so
  // e.g. a leftover "London" in the real city list would wrongly keep
  // GBP selected forever instead of re-anchoring to the real reference city.
  const [baseOverride, setBaseOverride] = useState<string | null>(null);
  useEffect(() => {
    setBaseOverride(null);
  }, [referenceCityId]);

  const baseCurrency = useMemo(() => {
    if (baseOverride && baseOptions.some((o) => o.currency === baseOverride)) {
      return baseOverride;
    }
    if (referenceCurrency && baseOptions.some((o) => o.currency === referenceCurrency)) {
      return referenceCurrency;
    }
    return baseOptions[0]?.currency ?? null;
  }, [baseOverride, baseOptions, referenceCurrency]);

  const [amountInput, setAmountInput] = useState("100");
  const amount = useMemo(() => {
    const parsed = parseFloat(amountInput.replace(",", "."));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [amountInput]);

  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [reloadToken, setReloadToken] = useState(0);

  const loadRates = useCallback((base: string) => {
    setStatus("loading");
    fetchExchangeRates(base)
      .then((data) => {
        setRates(data);
        setStatus("idle");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    if (!baseCurrency) return;
    loadRates(baseCurrency);
  }, [baseCurrency, reloadToken, loadRates]);

  const updatedLabel = useMemo(() => {
    if (!rates) return null;
    try {
      return new Intl.DateTimeFormat(luxonLocale, { dateStyle: "long" }).format(
        new Date(`${rates.date}T00:00:00Z`),
      );
    } catch {
      return rates.date;
    }
  }, [rates, luxonLocale]);

  return (
    <div
      className={`mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 sm:px-6 ${
        embedded ? "" : "pb-24 pt-6"
      }`}
    >
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t("heading")}</h1>
          <p className="text-sm text-foreground/60">{t("subtitle")}</p>
        </div>
      )}

      {sortedCities.length === 0 ? (
        <EmptyCitiesInvite />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="currency-base" className="text-sm font-medium text-foreground/70">
              {t("baseCurrencyLabel")}
            </label>
            <select
              id="currency-base"
              value={baseCurrency ?? ""}
              onChange={(e) => setBaseOverride(e.target.value)}
              disabled={baseOptions.length === 0}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            >
              {baseOptions.map((o) => (
                <option key={o.currency} value={o.currency}>
                  {o.currency} — {o.cityName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground/70">{t("amountLabel")}</span>
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmountInput(String(value))}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors ${
                    amount === value && amountInput === String(value)
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-foreground hover:border-primary/50"
                  }`}
                >
                  {new Intl.NumberFormat(luxonLocale).format(value)}
                </button>
              ))}
              <input
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder={t("customAmountPlaceholder")}
                aria-label={t("customAmountPlaceholder")}
                className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          {status === "loading" && !rates && (
            <p className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center text-sm text-foreground/50">
              {t("loading")}
            </p>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground/70">{t("errorTitle")}</p>
              <p className="max-w-sm text-sm text-foreground/50">{t("errorText")}</p>
              <button
                type="button"
                onClick={() => setReloadToken((n) => n + 1)}
                className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t("retry")}
              </button>
            </div>
          )}

          {rates && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sortedCities.map((comparedCity) => (
                  <CurrencyCard
                    key={comparedCity.city.id}
                    comparedCity={comparedCity}
                    amount={amount}
                    rates={rates}
                    locale={luxonLocale}
                    appLocale={locale}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-1 border-t border-border pt-4 text-xs text-foreground/50">
                {updatedLabel && <p>{t("updated", { date: updatedLabel })}</p>}
                <p>{t("disclaimer")}</p>
              </div>
            </>
          )}
        </>
      )}

      {!embedded && <AdBanner slot="infeed" />}
    </div>
  );
}
