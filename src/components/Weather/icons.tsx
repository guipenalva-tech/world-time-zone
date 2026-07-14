/**
 * Outline weather-condition glyphs for the /weather view, one per
 * `WeatherCategory` from @/lib/weather. Same stroke convention as the rest
 * of the app (viewBox 0 0 24 24, currentColor, round caps/joins) — the
 * cloud silhouette is shared verbatim with the WeatherIcon nav glyph in
 * @/components/icons/NavIcons for visual consistency between the nav link
 * and the cards it leads to. No emoji.
 */

import type { WeatherCategory } from "@/lib/weather";

interface GlyphIconProps {
  className?: string;
}

const BASE_SVG_PROPS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

const CLOUD_PATH =
  "M8.5 17.2h7A3.25 3.25 0 0 0 16 10.75a4.5 4.5 0 0 0-8.6-1.8 3.75 3.75 0 0 0 1.1 8.25z";

export function ClearIcon({ className = "h-6 w-6" }: GlyphIconProps) {
  return (
    <svg {...BASE_SVG_PROPS} className={className}>
      <circle cx="12" cy="11" r="4.5" />
      <path d="M12 2.5v2.25M12 17.25v2.25M4.4 4.9l1.6 1.6M16.6 15.1l1.6 1.6M2.5 11h2.25M17.25 11h2.25M4.4 17.1l1.6-1.6M16.6 6.9l1.6-1.6" />
    </svg>
  );
}

export function PartlyCloudyIcon({ className = "h-6 w-6" }: GlyphIconProps) {
  return (
    <svg {...BASE_SVG_PROPS} className={className}>
      <circle cx="7.5" cy="7" r="2.2" />
      <path d="M7.5 2.8v1.2M3.7 4.7l.9.9M11.3 4.7l-.9.9" />
      <path d={CLOUD_PATH} />
    </svg>
  );
}

export function CloudyIcon({ className = "h-6 w-6" }: GlyphIconProps) {
  return (
    <svg {...BASE_SVG_PROPS} className={className}>
      <path d="M3.6 15.4a2.9 2.9 0 0 1 .9-5.65 3.9 3.9 0 0 1 5.15-2.85" />
      <path d={CLOUD_PATH} />
    </svg>
  );
}

export function FogIcon({ className = "h-6 w-6" }: GlyphIconProps) {
  return (
    <svg {...BASE_SVG_PROPS} className={className}>
      <path d="M6 8.5h11.5" />
      <path d="M4 12.2h16" />
      <path d="M6 15.9h11.5" />
      <path d="M4 19.5h16" />
    </svg>
  );
}

export function RainIcon({ className = "h-6 w-6" }: GlyphIconProps) {
  return (
    <svg {...BASE_SVG_PROPS} className={className}>
      <path d={CLOUD_PATH} />
      <path d="M9 19.3l-1.1 2.2M12.5 19.3l-1.1 2.2M16 19.3l-1.1 2.2" />
    </svg>
  );
}

export function SnowIcon({ className = "h-6 w-6" }: GlyphIconProps) {
  return (
    <svg {...BASE_SVG_PROPS} className={className}>
      <path d={CLOUD_PATH} />
      <path d="M9 19v3.2M7.6 19.9l2.8 1.4M11.4 19.9l-2.8 1.4" />
      <path d="M15.5 19v3.2M14.1 19.9l2.8 1.4M17.9 19.9l-2.8 1.4" />
    </svg>
  );
}

export function StormIcon({ className = "h-6 w-6" }: GlyphIconProps) {
  return (
    <svg {...BASE_SVG_PROPS} className={className}>
      <path d={CLOUD_PATH} />
      <path d="M12.8 17.6 10.4 21h2.6l-1.4 2.7" />
    </svg>
  );
}

const CATEGORY_ICONS: Record<WeatherCategory, (props: GlyphIconProps) => React.JSX.Element> = {
  clear: ClearIcon,
  partlyCloudy: PartlyCloudyIcon,
  cloudy: CloudyIcon,
  fog: FogIcon,
  rain: RainIcon,
  snow: SnowIcon,
  storm: StormIcon,
};

interface WeatherCategoryIconProps extends GlyphIconProps {
  category: WeatherCategory;
}

/** Renders the right glyph for a `WeatherCategory` — the single entry point callers should use. */
export function WeatherCategoryIcon({ category, className }: WeatherCategoryIconProps) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon className={className} />;
}
