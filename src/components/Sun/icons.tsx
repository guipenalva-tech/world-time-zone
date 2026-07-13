/**
 * Outline sunrise/sunset glyphs for the Sun cards, matching the stroke
 * style (currentColor, round caps/joins) of the shared SunIcon/MoonIcon
 * in @/components/icons/SunMoonIcons. Each is a horizon line, a sun
 * sitting on it, and a chevron arrow above indicating rising (up) or
 * setting (down).
 */

interface GlyphIconProps {
  className?: string;
}

const BASE_SVG_PROPS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function SunriseIcon({ className = "h-5 w-5" }: GlyphIconProps) {
  return (
    <svg {...BASE_SVG_PROPS} className={className}>
      <line x1="3" y1="18" x2="21" y2="18" />
      <circle cx="12" cy="18" r="4" />
      <path d="M8.5 11 12 7.5 15.5 11" />
    </svg>
  );
}

export function SunsetIcon({ className = "h-5 w-5" }: GlyphIconProps) {
  return (
    <svg {...BASE_SVG_PROPS} className={className}>
      <line x1="3" y1="18" x2="21" y2="18" />
      <circle cx="12" cy="18" r="4" />
      <path d="M8.5 7.5 12 11 15.5 7.5" />
    </svg>
  );
}
