"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useConsentStore } from "@/stores/consentStore";

/**
 * LGPD/GDPR cookie-consent banner — the real gate behind the AdSense TODO
 * that used to live in the root layout. Shows on first visit (persisted
 * choice not yet made) and can be reopened anytime via the "Cookie
 * preferences" link in the footer (`openPreferences()`).
 *
 * "Accept all" and "Reject non-essential" are deliberately styled with
 * equal visual weight (same size/shape, only color differs) — GDPR
 * guidance treats a visually-dominant accept button paired with a
 * hidden/tiny reject option as an invalid ("dark pattern") consent flow.
 *
 * Rendered as a fixed overlay (not part of document flow), so it never
 * shifts page content regardless of when it appears or disappears.
 *
 * Alternative for later: once the AdSense account is approved, this
 * banner (and `useConsentStore`) could be replaced by Google's own
 * Funding Choices / consent management platform (CMP) — see the note in
 * `src/stores/consentStore.ts`.
 */
export default function ConsentBanner() {
  const t = useTranslations("Consent");
  const status = useConsentStore((s) => s.status);
  const bannerOpen = useConsentStore((s) => s.bannerOpen);
  const hasHydrated = useConsentStore((s) => s.hasHydrated);
  const acceptAll = useConsentStore((s) => s.acceptAll);
  const rejectNonEssential = useConsentStore((s) => s.rejectNonEssential);

  const acceptRef = useRef<HTMLButtonElement>(null);
  const visible = hasHydrated && (status === "unknown" || bannerOpen);

  useEffect(() => {
    if (visible) acceptRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t("ariaLabel")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:px-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{t("heading")}</p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/70">
            {t("description")}{" "}
            <Link
              href="/privacy"
              className="font-medium text-primary underline underline-offset-2"
            >
              {t("privacyLink")}
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={rejectNonEssential}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface sm:flex-none"
          >
            {t("rejectNonEssential")}
          </button>
          <button
            ref={acceptRef}
            type="button"
            onClick={acceptAll}
            className="flex-1 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 sm:flex-none"
          >
            {t("acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
