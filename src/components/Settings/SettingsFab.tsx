"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type AppLocale } from "@/i18n/routing";

/**
 * Bottom-right settings FAB (replaces the old actions FAB, which moved to
 * the top "Action" button). Currently only exposes the language switcher,
 * but the panel is structured so future options (12/24h, theme) can be
 * added as additional sections without restructuring.
 */
export default function SettingsFab() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const t = useTranslations("Settings");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDownOutside(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDownOutside);
    };
  }, [open]);

  function changeLocale(next: AppLocale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    const query = Object.fromEntries(searchParams.entries());
    router.replace({ pathname, query }, { locale: next });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40">
      {open && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="absolute bottom-16 right-0 w-64 rounded-lg border border-border bg-background p-3 shadow-xl"
        >
          <p className="mb-2 text-sm font-semibold text-foreground">
            {t("title")}
          </p>

          <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-foreground/50">
            {t("language")}
          </p>
          <ul className="flex flex-col gap-0.5">
            {locales.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  onClick={() => changeLocale(l)}
                  aria-current={l === locale}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface ${
                    l === locale
                      ? "font-semibold text-primary"
                      : "text-foreground/80"
                  }`}
                >
                  {localeNames[l]}
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-3 border-t border-border pt-2 text-[11px] text-foreground/40">
            {t("moreSoon")}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("openLabel")}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-foreground/70 shadow-lg transition-colors hover:bg-background hover:text-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <circle cx="12" cy="8" r="3.75" />
          <path d="M4.5 20c0-4.14 3.36-6.75 7.5-6.75s7.5 2.61 7.5 6.75" />
        </svg>
      </button>
    </div>
  );
}
