"use client";

import Script from "next/script";
import { useConsentStore } from "@/stores/consentStore";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/**
 * Loads the global AdSense script (`adsbygoogle.js`), gated behind the
 * cookie-consent banner — this is the real gate behind what used to be a
 * TODO in the root layout. Renders nothing (no `<Script>` in the DOM at
 * all) until `useConsentStore` reports `status === "accepted"`, so the
 * AdSense script never reaches the browser pre-consent, not just the ad
 * unit itself (see `AdBanner`'s own gate for that half).
 *
 * Waits on `hasHydrated` too, so a returning visitor who already accepted
 * doesn't flash without the script for a frame before persist rehydrates.
 *
 * Alternative for later: once the AdSense account is approved, Google's
 * own Funding Choices / CMP can replace this component and the banner in
 * `src/components/Consent` — it ships as an AdSense-managed script tag
 * and handles regional consent signals (TCF, US state laws) for you.
 */
export default function AdSenseLoader() {
  const status = useConsentStore((s) => s.status);
  const hasHydrated = useConsentStore((s) => s.hasHydrated);

  if (!ADSENSE_CLIENT || !hasHydrated || status !== "accepted") return null;

  return (
    <Script
      id="adsbygoogle-init"
      strategy="lazyOnload"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
