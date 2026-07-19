"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, localeCountryCode, type AppLocale } from "@/i18n/routing";
import { getFlagEmoji } from "@/lib/flags";

interface LanguageSelectProps {
  /** "dropdown": compact trigger + popover (header). "list": inline list, no trigger (settings panel). */
  variant?: "dropdown" | "list";
  className?: string;
}

/**
 * Locale switcher, shared by the header's top-right controls and the
 * settings FAB panel so the switching logic (and the locale-aware URL
 * rewrite) lives in exactly one place.
 */
export default function LanguageSelect({
  variant = "dropdown",
  className = "",
}: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const t = useTranslations("Settings");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (variant !== "dropdown" || !open) return;

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
  }, [open, variant]);

  function changeLocale(next: AppLocale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    const query = Object.fromEntries(searchParams.entries());
    router.replace({ pathname, query }, { locale: next });
    setOpen(false);
  }

  const list = (
    <ul className="flex flex-col gap-0.5">
      {locales.map((l) => (
        <li key={l}>
          <button
            type="button"
            onClick={() => changeLocale(l)}
            aria-current={l === locale}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface ${
              l === locale ? "font-semibold text-primary" : "text-foreground/80"
            }`}
          >
            <span aria-hidden="true">{getFlagEmoji(localeCountryCode[l])}</span>
            {localeNames[l]}
          </button>
        </li>
      ))}
    </ul>
  );

  if (variant === "list") {
    return <div className={className}>{list}</div>;
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("language")}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-background hover:text-foreground"
      >
        <span aria-hidden="true">
          {getFlagEmoji(localeCountryCode[locale as AppLocale])}
        </span>
        <span aria-hidden="true" className="text-xs">
          {locale.toUpperCase()}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("language")}
          className="absolute right-0 z-40 mt-1 max-h-80 w-44 overflow-y-auto rounded-lg border border-border bg-background p-1.5 shadow-xl"
        >
          {list}
        </div>
      )}
    </div>
  );
}
