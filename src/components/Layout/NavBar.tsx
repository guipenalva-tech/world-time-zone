"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEM_DEFS } from "./navItemDefs";
import { NAV_IDS, reconcileNavOrder } from "@/lib/navOrder";
import { useSettingsStore } from "@/stores/settingsStore";

const chevronDownIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/** Small buffer subtracted from the measured available width so subpixel
 * rounding never causes the last visible item to clip against the edge. */
const WIDTH_SAFETY_BUFFER = 4;
/** Matches the `gap-1` (0.25rem) tailwind class used on every row below. */
const ITEM_GAP = 4;

const itemLinkClass = (isActive: boolean) =>
  `flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "border-primary text-primary"
      : "border-transparent text-foreground/60 hover:border-border hover:text-foreground"
  }`;

/**
 * Section navigation for the 9 top-level views. Rendered as its own row
 * inside the sticky header so it scrolls with it.
 *
 * All 9 items render in the user's customized order (`navOrder`, from
 * settingsStore — see `@/lib/navOrder`). On every viewport, as many items
 * as fit are shown inline; whatever doesn't fit collapses into a "More"
 * dropdown at the end of the row. This is measured dynamically (a
 * "priority+ navigation" pattern) via a hidden, identically-styled copy of
 * the row plus a ResizeObserver on the visible row's container — so it
 * adapts continuously as the window is resized, rather than switching at a
 * couple of fixed breakpoints. The same logic runs at every width,
 * including mobile, so there's a single code path instead of a separate
 * mobile scroll-row.
 */
export default function NavBar() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();

  const rawNavOrder = useSettingsStore((s) => s.navOrder);
  const navOrder = useMemo(() => reconcileNavOrder(rawNavOrder, NAV_IDS), [rawNavOrder]);
  const items = useMemo(
    () => navOrder.map((id) => ({ href: id, ...NAV_ITEM_DEFS[id] })),
    [navOrder],
  );

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);

  // ---- Responsive overflow measurement ("priority+" pattern) ----
  const containerRef = useRef<HTMLDivElement>(null);
  const itemMeasureRefs = useRef<Array<HTMLLIElement | null>>([]);
  const moreMeasureRef = useRef<HTMLLIElement>(null);
  // null = not measured yet — render every item so there's content on the
  // very first paint (before hydration/ResizeObserver can run).
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const available = container.clientWidth - WIDTH_SAFETY_BUFFER;
    const itemWidths = itemMeasureRefs.current.map(
      (el) => el?.getBoundingClientRect().width ?? 0,
    );
    const moreWidth = moreMeasureRef.current?.getBoundingClientRect().width ?? 0;

    const allItemsWidth = itemWidths.reduce((sum, w) => sum + w + ITEM_GAP, 0);

    // Everything fits without a "More" button at all.
    if (allItemsWidth <= available) {
      setVisibleCount(itemWidths.length);
      return;
    }

    // Otherwise reserve room for the "More" button too, and fit as many
    // leading items as possible in what's left.
    let total = moreWidth + ITEM_GAP;
    let count = 0;
    for (let i = 0; i < itemWidths.length; i++) {
      total += itemWidths[i] + ITEM_GAP;
      if (total <= available) {
        count++;
      } else {
        break;
      }
    }
    setVisibleCount(count);
  }, []);

  // Re-measure whenever the order or the label text (locale) changes —
  // item widths depend on both.
  useLayoutEffect(() => {
    measure();
  }, [measure, navOrder, locale]);

  // Re-measure whenever the row's available width changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure]);

  const visibleItems = visibleCount === null ? items : items.slice(0, visibleCount);
  const hiddenItems = visibleCount === null ? [] : items.slice(visibleCount);
  const hasOverflow = hiddenItems.length > 0;
  const isOverflowActive = hiddenItems.some((item) => pathname === item.href);

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
    <nav aria-label={t("home")} className="border-t border-border/60 px-4 sm:px-6">
      <div ref={containerRef} className="relative flex items-center gap-1">
        {/* Hidden measuring row: every item + the "More" trigger, styled
            identically to the visible row, so their true rendered widths
            can be read via getBoundingClientRect. Wrapped in a zero-height,
            overflow-hidden, absolutely-positioned box (not just an
            invisible one) so it can never expand the page's scrollable
            area, however wide the full 9-item row gets. */}
        <div
          aria-hidden="true"
          className="pointer-events-none invisible absolute left-0 top-0 h-0 w-full overflow-hidden"
        >
          <ul className="flex items-center gap-1 whitespace-nowrap">
            {items.map((item, i) => (
              <li
                key={item.href}
                ref={(el) => {
                  itemMeasureRefs.current[i] = el;
                }}
                className="shrink-0"
              >
                <span className={itemLinkClass(false)}>
                  {item.icon}
                  {t(item.labelKey)}
                </span>
              </li>
            ))}
            <li ref={moreMeasureRef} className="shrink-0">
              <span className={itemLinkClass(false)}>
                {t("more")}
                {chevronDownIcon}
              </span>
            </li>
          </ul>
        </div>

        {/* Visible row */}
        <ul className="flex min-w-0 items-center gap-1 overflow-hidden">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={itemLinkClass(isActive)}
                >
                  {item.icon}
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}

          {hasOverflow && (
            <li ref={moreRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={moreOpen}
                className={itemLinkClass(isOverflowActive)}
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
                  {hiddenItems.map((item) => {
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
          )}
        </ul>
      </div>
    </nav>
  );
}
