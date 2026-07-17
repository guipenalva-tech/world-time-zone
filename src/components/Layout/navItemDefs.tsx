import type { ReactNode } from "react";
import {
  WeatherIcon,
  CurrencyIcon,
  NewsIcon,
  FlightsIcon,
} from "@/components/icons/NavIcons";
import type { NavId } from "@/lib/navOrder";

export type NavLabelKey =
  | "home"
  | "chart"
  | "map"
  | "sun"
  | "alerts"
  | "weather"
  | "currency"
  | "news"
  | "flights";

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

interface NavItemDef {
  labelKey: NavLabelKey;
  icon: ReactNode;
}

/**
 * Label + icon for every top-level nav route, keyed by route path (== the
 * `NavId` ids used in `navOrder`). Order-independent by design — the
 * user-facing order comes from `navOrder`, not from this map.
 */
export const NAV_ITEM_DEFS: Record<NavId, NavItemDef> = {
  "/": { labelKey: "home", icon: clockIcon },
  "/chart": { labelKey: "chart", icon: chartIcon },
  "/map": { labelKey: "map", icon: mapIcon },
  "/sun": { labelKey: "sun", icon: sunIcon },
  "/alerts": { labelKey: "alerts", icon: bellIcon },
  "/weather": { labelKey: "weather", icon: <WeatherIcon /> },
  "/currency": { labelKey: "currency", icon: <CurrencyIcon /> },
  "/news": { labelKey: "news", icon: <NewsIcon /> },
  "/flights": { labelKey: "flights", icon: <FlightsIcon /> },
};
