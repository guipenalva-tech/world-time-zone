import type { ReactNode } from "react";
import {
  ClockIcon,
  ChartIcon,
  MapIcon,
  SunIcon,
  AlertsIcon,
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
  "/": { labelKey: "home", icon: <ClockIcon /> },
  "/chart": { labelKey: "chart", icon: <ChartIcon /> },
  "/map": { labelKey: "map", icon: <MapIcon /> },
  "/sun": { labelKey: "sun", icon: <SunIcon /> },
  "/alerts": { labelKey: "alerts", icon: <AlertsIcon /> },
  "/weather": { labelKey: "weather", icon: <WeatherIcon /> },
  "/currency": { labelKey: "currency", icon: <CurrencyIcon /> },
  "/news": { labelKey: "news", icon: <NewsIcon /> },
  "/flights": { labelKey: "flights", icon: <FlightsIcon /> },
};
