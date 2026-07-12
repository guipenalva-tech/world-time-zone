"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const ADSENSE_SLOT_BOTTOM = process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM;

/**
 * Bottom-of-page AdSense banner (leaderboard/horizontal, responsive).
 *
 * Reserves a fixed min-height for both the live ad and the placeholder so
 * swapping between them (or the ad loading async) never shifts layout —
 * this is what keeps CLS at zero regardless of AdSense approval status.
 *
 * Without `NEXT_PUBLIC_ADSENSE_CLIENT` / `NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM`
 * set (local dev, previews, or before AdSense approval) it renders a
 * discreet placeholder instead of the real ad unit.
 */
export default function AdBanner() {
  const t = useTranslations("Ads");
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  const isConfigured = Boolean(ADSENSE_CLIENT && ADSENSE_SLOT_BOTTOM);

  useEffect(() => {
    if (!isConfigured) return;
    // Guard against double-push: React 18 StrictMode double-invokes effects
    // in dev, and locale switches can remount this component without a full
    // page reload — adsbygoogle.push() on an already-filled <ins> throws.
    if (pushedRef.current) return;
    if (insRef.current?.getAttribute("data-adsbygoogle-status")) return;

    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
      pushedRef.current = true;
    } catch {
      // AdSense script not loaded yet (e.g. fake/local envs) or blocked by
      // an ad blocker — fail silently, this is expected outside production.
    }
  }, [isConfigured]);

  return (
    <div className="mx-4 mb-8 flex flex-col items-center gap-2 sm:mx-6">
      <span className="text-[11px] uppercase tracking-wide text-foreground/40">
        {t("label")}
      </span>

      {isConfigured ? (
        <ins
          ref={insRef}
          className="adsbygoogle block w-full"
          style={{ display: "block", minHeight: 100 }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_SLOT_BOTTOM}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div
          className="flex w-full min-h-[100px] items-center justify-center rounded-lg border border-dashed border-border text-xs text-foreground/40"
          aria-hidden="true"
        >
          {t("placeholder")}
        </div>
      )}
    </div>
  );
}
