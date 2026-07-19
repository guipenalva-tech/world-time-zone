"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { fetchExchangeRates, type ExchangeRates } from "@/lib/currency";

interface CityCurrencyWidgetProps {
  /** ISO 4217 code for the city's country, or undefined if
   * `getCurrencyForCountry` couldn't resolve one (rare — every country in
   * cities.json is covered, but kept optional to stay honest about that
   * lookup being a static map, not a live source). */
  currency: string | undefined;
  cityName: string;
  locale: string;
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; rates: ExchangeRates };

/**
 * Currency section for a /time/[city] page: 1 USD and 1 EUR quoted in the
 * city's own currency, via a single Frankfurter fetch (base=USD) —
 * the EUR quote is triangulated from the USD-based rates rather than a
 * second request. Fetches client-side on mount (lazy-mounted by the
 * caller), and is upfront when Frankfurter simply doesn't cover a
 * currency (reused `Currency.unavailable` copy, same as the /currency
 * page) rather than silently hiding the section.
 */
export default function CityCurrencyWidget({
  currency,
  cityName,
  locale,
}: CityCurrencyWidgetProps) {
  const t = useTranslations("Currency");
  const tCity = useTranslations("CityPage");
  const [state, setState] = useState<State>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!currency) return;
    let cancelled = false;
    setState({ status: "loading" });
    fetchExchangeRates("USD")
      .then((rates) => {
        if (!cancelled) setState({ status: "success", rates });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [currency, retryToken]);

  const formatValue = (value: number) =>
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: value < 10 ? 4 : 2,
    }).format(value);

  if (!currency) {
    return <p className="text-sm text-foreground/50">{t("unavailable")}</p>;
  }

  if (state.status === "loading") {
    return (
      <div
        className="h-16 animate-pulse rounded bg-foreground/5"
        aria-hidden="true"
      />
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-danger/40 bg-danger/5 px-3 py-6 text-center">
        <p className="text-sm text-danger">{t("errorText")}</p>
        <button
          type="button"
          onClick={() => setRetryToken((n) => n + 1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:border-primary hover:text-primary"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const { rates } = state;
  const eurPerUsd = rates.rates["EUR"];

  if (currency === "USD") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">{tCity("currencyIsUsd", { city: cityName })}</p>
        {eurPerUsd !== undefined && (
          <p className="font-mono text-sm tabular-nums text-foreground/70">
            {t("rateLine", {
              base: "EUR",
              value: formatValue(1 / eurPerUsd),
              currency: "USD",
            })}
          </p>
        )}
      </div>
    );
  }

  if (currency === "EUR") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">{tCity("currencyIsEur", { city: cityName })}</p>
        {eurPerUsd !== undefined && (
          <p className="font-mono text-sm tabular-nums text-foreground/70">
            {t("rateLine", {
              base: "USD",
              value: formatValue(eurPerUsd),
              currency: "EUR",
            })}
          </p>
        )}
      </div>
    );
  }

  const usdValue = rates.rates[currency];
  if (usdValue === undefined) {
    return <p className="text-sm text-foreground/50">{t("unavailable")}</p>;
  }
  const eurValue = eurPerUsd !== undefined ? usdValue / eurPerUsd : undefined;

  return (
    <div className="flex flex-col gap-1.5 font-mono text-sm tabular-nums">
      <p>
        {t("rateLine", { base: "USD", value: formatValue(usdValue), currency })}
      </p>
      {eurValue !== undefined && (
        <p>
          {t("rateLine", {
            base: "EUR",
            value: formatValue(eurValue),
            currency,
          })}
        </p>
      )}
    </div>
  );
}
