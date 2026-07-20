"use client";

import type { ReactNode } from "react";

export interface JumpNavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface JumpNavProps {
  items: JumpNavItem[];
  ariaLabel: string;
}

/**
 * Small chip row near the top of the home dashboard for jumping straight to
 * any section below (distinct from the main site NavBar, which links to the
 * dedicated pages). Real `#hash` anchors (so they work with no JS, and are
 * keyboard/middle-click friendly) with a click handler that smooth-scrolls
 * instead of the browser's default instant jump — scoped to just these
 * clicks rather than a page-wide `scroll-behavior: smooth`, which fights
 * with ordinary wheel/trackpad scrolling. Each section's `scroll-mt` (see
 * SectionHeader) keeps the sticky header from covering the target either
 * way.
 */
export default function JumpNav({ items, ariaLabel }: JumpNavProps) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav aria-label={ariaLabel} className="sticky top-[57px] z-20 border-b border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:border-primary/50 hover:text-primary"
            >
              {item.icon}
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
