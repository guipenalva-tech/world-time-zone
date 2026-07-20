"use client";

import { useTranslations } from "next-intl";

// Common currency codes and their symbols
export const CURRENCY_MAP: Record<string, { code: string; symbol: string; name: string }> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
  EUR: { code: "EUR", symbol: "€", name: "Euro" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound" },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  KRW: { code: "KRW", symbol: "₩", name: "South Korean Won" },
  MXN: { code: "MXN", symbol: "$", name: "Mexican Peso" },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
};

// Approximate USD conversion rates (1 USD = X)
export const CONVERSION_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149,
  BRL: 4.97,
  INR: 83.5,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.89,
  CNY: 7.24,
  KRW: 1330,
  MXN: 17.5,
  SGD: 1.35,
};

interface CurrencyPickerProps {
  currency: string;
  onChange: (currency: string) => void;
}

export default function CurrencyPicker({ currency, onChange }: CurrencyPickerProps) {
  const t = useTranslations("Flights");
  const currencyInfo = CURRENCY_MAP[currency] || CURRENCY_MAP.USD;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-foreground/50">{t("currencyLabel") || "Currency:"}</span>
      <div className="relative inline-flex">
        <select
          value={currency}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 focus:border-primary focus:outline-none"
        >
          {Object.entries(CURRENCY_MAP).map(([code, info]) => (
            <option key={code} value={code}>
              {info.symbol} {code}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Convert USD amount to another currency using approximate rates.
 * These are estimates for flight pricing only, not real-time rates.
 */
export function convertUsdTo(amountUsd: number, targetCurrency: string): number {
  const rate = CONVERSION_RATES[targetCurrency] || 1;
  return amountUsd * rate;
}
