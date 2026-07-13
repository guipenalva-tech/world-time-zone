/**
 * Shared outline sun/moon glyphs (stroke-based, currentColor) used across
 * the site — originally defined in ThemeToggle, factored out so the Sun
 * view can reuse the exact same shapes for visual consistency instead of
 * emoji.
 *
 * `SunGlyphPaths`/`MoonGlyphPaths` are the bare `<circle>`/`<path>` shapes
 * (no `<svg>` wrapper), meant to be dropped into a caller-provided `<svg>`
 * — e.g. nested inside another SVG via a sized viewport element. `SunIcon`
 * and `MoonIcon` are the standalone, ready-to-render versions with their
 * own `<svg>` wrapper for normal inline use.
 */

export function SunGlyphPaths() {
  return (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.25M12 19.25v2.25M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.4 19.6l1.6-1.6M18 6l1.6-1.6" />
    </>
  );
}

export function MoonGlyphPaths() {
  return <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />;
}

interface GlyphIconProps {
  className?: string;
}

export function SunIcon({ className = "h-5 w-5" }: GlyphIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <SunGlyphPaths />
    </svg>
  );
}

export function MoonIcon({ className = "h-5 w-5" }: GlyphIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <MoonGlyphPaths />
    </svg>
  );
}
