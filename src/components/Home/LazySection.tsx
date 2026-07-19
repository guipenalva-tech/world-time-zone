"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazySectionProps {
  children: ReactNode;
  /** Tailwind min-height class applied to the placeholder (and to the
   * wrapper until mounted), e.g. "min-h-[420px]". Keeps the page from
   * jumping while the section is still off-screen/unmounted. */
  minHeightClassName: string;
  /** How far below the viewport mounting should start. Default 400px, per
   * the "mount slightly before it's visible" requirement. */
  rootMargin?: string;
}

/**
 * Defers mounting `children` until the section scrolls near the viewport
 * (IntersectionObserver, default rootMargin 400px), so the home dashboard
 * doesn't fire all 8 feature sections' work (4 of which hit external APIs)
 * on first paint. Renders a fixed-height placeholder until then, and keeps
 * `children` mounted permanently once shown (no unmount-on-scroll-away —
 * that would cost re-fetching/re-computing every time it re-enters view).
 */
export default function LazySection({
  children,
  minHeightClassName,
  rootMargin = "400px",
}: LazySectionProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      // No IO support: render eagerly rather than never.
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={visible ? undefined : minHeightClassName}>
      {visible ? (
        children
      ) : (
        <div
          className={`flex w-full items-center justify-center ${minHeightClassName}`}
          aria-hidden="true"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      )}
    </div>
  );
}
