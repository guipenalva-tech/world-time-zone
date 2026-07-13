"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type PermissionState = "unsupported" | "default" | "granted" | "denied";

/**
 * Notification-permission banner for /alerts: never requests permission
 * automatically (browsers require a user gesture, and it'd be rude even if
 * they didn't) — only shows an "enable" button while permission is in its
 * default (unasked) state. Once granted or denied, shows a status message
 * instead. Always paired with the honest "only while this tab is open"
 * limitation notice, rendered by the parent.
 */
export default function NotificationPermissionBanner() {
  const t = useTranslations("Alerts.permission");
  const [state, setState] = useState<PermissionState>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as PermissionState);
  }, []);

  function requestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    Notification.requestPermission().then((result) => {
      setState(result as PermissionState);
    });
  }

  const toneClasses: Record<PermissionState, string> = {
    unsupported: "border-border bg-surface/50 text-foreground/60",
    default: "border-border bg-surface/50 text-foreground/70",
    granted: "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-foreground/80",
    denied: "border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-foreground/80",
  };

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between ${toneClasses[state]}`}
    >
      <p>
        {state === "granted" && t("granted")}
        {state === "denied" && t("denied")}
        {state === "unsupported" && t("unsupported")}
        {state === "default" && t("default")}
      </p>
      {state === "default" && (
        <button
          type="button"
          onClick={requestPermission}
          className="shrink-0 self-start rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:self-auto"
        >
          {t("enableButton")}
        </button>
      )}
    </div>
  );
}
