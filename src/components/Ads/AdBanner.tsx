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
const ADSENSE_SLOT_INFEED_1 = process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED_1;
const ADSENSE_SLOT_INFEED_2 = process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED_2;

/** Named ad placements, each backed by its own env var (see above) — kept
 * as literal `process.env.NEXT_PUBLIC_*` reads so Next.js can statically
 * inline them; a dynamic `process.env[name]` lookup would not be replaced
 * at build time. */
export type AdSlotName = "bottom" | "infeed1" | "infeed2";

const SLOT_IDS: Record<AdSlotName, string | undefined> = {
  bottom: ADSENSE_SLOT_BOTTOM,
  infeed1: ADSENSE_SLOT_INFEED_1,
  infeed2: ADSENSE_SLOT_INFEED_2,
};

interface AdBannerProps {
  /** Which placement this instance renders. Defaults to "bottom" so the
   * existing footer usage needs no change. */
  slot?: AdSlotName;
}

/**
 * AdSense banner (leaderboard/horizontal, responsive). Used both at the
 * bottom of every page and, on the home dashboard, in-feed between a couple
 * of sections (`slot="infeed1"` / `"infeed2"`) — each placement reads its
 * own slot id so multiple instances can render on the same page.
 *
 * Reserves a fixed min-height for both the live ad and the placeholder so
 * swapping between them (or the ad loading async) never shifts layout —
 * this is what keeps CLS at zero regardless of AdSense approval status.
 *
 * Without `NEXT_PUBLIC_ADSENSE_CLIENT` / the slot's own env var set (local
 * dev, previews, or before AdSense approval) it renders a discreet
 * placeholder instead of the real ad unit.
 */
export default function AdBanner({ slot = "bottom" }: AdBannerProps) {
  const t = useTranslations("Ads");
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  const adSlotId = SLOT_IDS[slot];
  const isConfigured = Boolean(ADSENSE_CLIENT && adSlotId);

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
          data-ad-slot={adSlotId}
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
