/**
 * Outline icons for the 4 secondary nav items added in the Weather /
 * Currency / News / Flights expansion. Centralized here (rather than
 * inlined in NavBar.tsx like the original 5) so the same glyphs can be
 * reused at a larger size on the stub pages' PlaceholderCard.
 *
 * All icons share the app-wide outline convention: viewBox 0 0 24 24,
 * fill="none", stroke="currentColor", rounded caps/joins.
 */

interface IconProps {
  className?: string;
}

export function WeatherIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7.5" cy="7" r="2.2" />
      <path d="M7.5 2.8v1.2M3.7 4.7l.9.9M11.3 4.7l-.9.9" />
      <path d="M8.5 17.2h7A3.25 3.25 0 0 0 16 10.75a4.5 4.5 0 0 0-8.6-1.8 3.75 3.75 0 0 0 1.1 8.25z" />
    </svg>
  );
}

export function CurrencyIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v5M17.5 9.5v5" />
    </svg>
  );
}

export function NewsIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M7.5 8h5M7.5 11.5h9M7.5 14.5h9M7.5 17h9" />
    </svg>
  );
}

export function FlightsIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
      <line x1="22" y1="2" x2="11" y2="13" />
    </svg>
  );
}

/** Outline "sliders" icon for the nav-customize (reorder) trigger. */
export function SlidersIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="5" y1="4" x2="5" y2="20" />
      <circle cx="5" cy="9" r="2.2" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <circle cx="12" cy="15" r="2.2" />
      <line x1="19" y1="4" x2="19" y2="20" />
      <circle cx="19" cy="7" r="2.2" />
    </svg>
  );
}
