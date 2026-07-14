"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  WeatherIcon,
  CurrencyIcon,
  NewsIcon,
  FlightsIcon,
} from "@/components/icons/NavIcons";

type NavHref =
  | "/"
  | "/chart"
  | "/map"
  | "/sun"
  | "/alerts"
  | "/weather"
  | "/currency"
  | "/news"
  | "/flights";

type NavLabelKey =
  | "home"
  | "chart"
  | "map"
  | "sun"
  | "alerts"
  | "weather"
  | "currency"
  | "news"
  | "flights";

interface NavItem {
  href: NavHref;
  labelKey: NavLabelKey;
  icon: React.ReactNode;
}

const clockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

const chartIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <path d="M4 19V9" />
    <path d="M10 19V5" />
    <path d="M16 19v-7" />
    <path d="M4 19h16" />
  </svg>
);

const mapIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9z" />
  </svg>
);

const sunIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.25M12 19.25v2.25M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.4 19.6l1.6-1.6M18 6l1.6-1.6" />
  </svg>
);

const bellIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </svg>
);

/** The 5 original views — always visible, on every viewport. */
const PRIMARY_ITEMS: NavItem[] = [
  { href: "/", labelKey: "home", icon: clockIcon },
  { href: "/chart", labelKey: "chart", icon: chartIcon },
  { href: "/map", labelKey: "map", icon: mapIcon },
  { href: "/sun", labelKey: "sun", icon: sunIcon },
  { href: "/alerts", labelKey: "alerts", icon: bellIcon },
];

/**
 * The 4 newer views. On desktop these collapse into a "More" dropdown so
 * the primary 5 keep a stable, uncluttered row. On mobile there's no room
 * for a dropdown trigger *and* a scrollable row, so they're appended to
 * the same scrollable row as the primary items instead.
 */
const OVERFLOW_ITEMS: NavItem[] = [
  { href: "/weather", labelKey: "weather", icon: <WeatherIcon /> },
  { href: "/currency", labelKey: "currency", icon: <CurrencyIcon /> },
  { href: "/news", labelKey: "news", icon: <NewsIcon /> },
  { href: "/flights", labelKey: "flights", icon: <FlightsIcon /> },
];

const ALL_ITEMS: NavItem[] = [...PRIMARY_ITEMS, ...OVERFLOW_ITEMS];

const chevronDownIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/**
 * Section navigation for the 9 top-level views. Rendered as its own row
 * inside the sticky header so it scrolls with it.
 *
 * - Mobile (< sm): a single horizontally scrollable row with all 9 items —
 *   there's no space for a dropdown trigger, and touch-scrolling a nav row
 *   is a well-understood pattern.
 * - Desktop (>= sm): the 5 primary items stay pinned and visible, with the
 *   4 newer items tucked behind a "More" dropdown so the row doesn't grow
 *   unbounded as more sections are added later.
 */
export default function NavBar() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);

  const isOverflowActive = OVERFLOW_ITEMS.some((item) => pathname === item.href);

  useEffect(() => {
    if (!moreOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    function onPointerDownOutside(e: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDownOutside);
    };
  }, [moreOpen]);

  return (
    <nav
      aria-label={t("home")}
      className="border-t border-border/60 px-4 sm:px-6"
    >
      {/* Mobile: all 9 items in one scrollable row */}
      <ul className="flex items-center gap-1 overflow-x-auto sm:hidden">
        {ALL_ITEMS.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground/60 hover:border-border hover:text-foreground"
              }`}
            >
              {item.icon}
              {t(item.labelKey)}
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: 5 primary items pinned + "More" dropdown for the rest */}
      <ul className="hidden items-center gap-1 sm:flex">
        {PRIMARY_ITEMS.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground/60 hover:border-border hover:text-foreground"
              }`}
            >
              {item.icon}
              {t(item.labelKey)}
            </Link>
          </li>
        ))}

        <li ref={moreRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={moreOpen}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium transition-colors ${
              isOverflowActive
                ? "border-primary text-primary"
                : "border-transparent text-foreground/60 hover:border-border hover:text-foreground"
            }`}
          >
            {t("more")}
            <span className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}>
              {chevronDownIcon}
            </span>
          </button>

          {moreOpen && (
            <div
              role="menu"
              className="absolute left-0 z-40 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-background shadow-xl"
            >
              {OVERFLOW_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-surface text-primary"
                        : "text-foreground/80 hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          )}
        </li>
      </ul>
    </nav>
  );
}
