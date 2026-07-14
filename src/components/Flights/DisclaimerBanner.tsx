"use client";

import { useTranslations } from "next-intl";

/**
 * Highly visible "these are estimates, not real fares" banner for /flights.
 * Placed right below the page header — deliberately not a small footer
 * note — since every price/duration on this page is formula-derived (see
 * src/lib/flightEstimate.ts) rather than pulled from a real flights API.
 */
export default function DisclaimerBanner() {
  const t = useTranslations("Flights");

  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-5 w-5 shrink-0 text-danger"
        aria-hidden="true"
      >
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-danger">{t("disclaimerTitle")}</p>
        <p className="text-xs leading-relaxed text-danger/90">
          {t("disclaimerText")}
        </p>
      </div>
    </div>
  );
}
