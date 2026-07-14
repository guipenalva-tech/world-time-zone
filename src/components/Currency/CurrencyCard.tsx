"use client";

import { useTranslations } from "next-intl";
import type { ComparedCity } from "@/types/city";
import type { ExchangeRates } from "@/lib/currency";
import { getCurrencyForCountry, convertAmount } from "@/lib/currency";
import { getFlagEmoji } from "@/lib/flags";

interface CurrencyCardProps {
  comparedCity: ComparedCity;
  amount: number;
  rates: ExchangeRates;
  locale: string;
}

/** One compared city's converted amount, or a clear "unavailable" state
 * when its currency isn't one of Frankfurter's ~30 supported currencies. */
export default function CurrencyCard({ comparedCity, amount, rates, locale }: CurrencyCardProps) {
  const t = useTranslations("Currency");
  const { city } = comparedCity;
  const currency = getCurrencyForCountry(city.countryCode);
  const isBase = currency === rates.base;
  const converted = currency ? convertAmount(amount, currency, rates) : null;

  const formatMoney = (value: number, currencyCode: string) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${value.toFixed(2)} ${currencyCode}`;
    }
  };

  const unitRate = currency && !isBase ? rates.rates[currency] : undefined;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-4">
      <header className="flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">
          {getFlagEmoji(city.countryCode)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{city.name}</p>
          <p className="truncate text-xs text-foreground/50">{city.country}</p>
        </div>
        {isBase && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {t("baseCurrency")}
          </span>
        )}
      </header>

      {!currency || converted === null ? (
        <p className="text-sm text-foreground/50">{t("unavailable")}</p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xl font-semibold tabular-nums">
            {formatMoney(converted, currency)}
          </p>
          {!isBase && unitRate !== undefined && (
            <p className="text-xs text-foreground/50">
              {t("rateLine", {
                base: rates.base,
                value: new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(unitRate),
                currency,
              })}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
