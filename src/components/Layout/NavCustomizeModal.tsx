"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useSettingsStore } from "@/stores/settingsStore";
import { NAV_IDS, reconcileNavOrder, moveItem } from "@/lib/navOrder";
import { NAV_ITEM_DEFS } from "./navItemDefs";

interface NavCustomizeModalProps {
  open: boolean;
  onClose: () => void;
}

const closeIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const upIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
    <path d="M6 15l6-6 6 6" />
  </svg>
);

const downIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/**
 * "Customize navigation" modal — reorders the 9 top-level nav routes.
 * Every reorder (drag, or the ↑/↓ buttons) writes straight to
 * settingsStore.navOrder, so the nav bar behind the modal updates live;
 * there's no separate "Save" step, only "Reset to default" and closing.
 *
 * Drag-to-reorder mirrors the comparator's TimezoneRow drag (see
 * `Comparator.tsx`'s pointer-event handlers) adapted to a vertical list:
 * native pointer events, no external DnD library, with an equivalent
 * ↑/↓ button pair per row for keyboard/screen-reader users.
 *
 * Rendered via a portal into `document.body` rather than inline where
 * `<NavBar>` sits in the tree. `<Header>` (the nav bar's parent) uses
 * `backdrop-blur`, and per the CSS Filter Effects spec, `backdrop-filter`
 * (like `transform`/`filter`) makes an element the containing block for
 * its `position: fixed` descendants — so a `fixed inset-0` modal nested
 * under it would be sized/positioned relative to the (short) header box
 * instead of the viewport. Portaling to `document.body` sidesteps that
 * entirely, which is the standard fix for this class of bug.
 */
export default function NavCustomizeModal({ open, onClose }: NavCustomizeModalProps) {
  const t = useTranslations("Nav");
  const tc = useTranslations("NavCustomize");
  const rawNavOrder = useSettingsStore((s) => s.navOrder);
  const setNavOrder = useSettingsStore((s) => s.setNavOrder);
  const resetNavOrder = useSettingsStore((s) => s.resetNavOrder);
  const navOrder = reconcileNavOrder(rawNavOrder, NAV_IDS);

  const panelRef = useRef<HTMLDivElement>(null);

  // ---- Drag-to-reorder state (native pointer events, no external lib) ----
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const rowRectsRef = useRef<{ top: number; height: number }[]>([]);
  const dragStartYRef = useRef(0);
  const dragIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const navOrderRef = useRef(navOrder);
  navOrderRef.current = navOrder;
  const setNavOrderRef = useRef(setNavOrder);
  setNavOrderRef.current = setNavOrder;

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragDeltaY, setDragDeltaY] = useState(0);

  rowRefs.current = rowRefs.current.slice(0, navOrder.length);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointerDownOutside(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDownOutside);
    };
  }, [open, onClose]);

  // Global pointer listeners for the active drag, registered once — same
  // shape as Comparator.tsx's row-drag effect.
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (dragIndexRef.current === null) return;
      setDragDeltaY(e.clientY - dragStartYRef.current);

      let closest = dragIndexRef.current;
      let closestDist = Infinity;
      rowRectsRef.current.forEach((rect, i) => {
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(e.clientY - center);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      dragOverIndexRef.current = closest;
      setDragOverIndex(closest);
    }

    function endDrag() {
      if (dragIndexRef.current === null) return;
      const from = dragIndexRef.current;
      const to = dragOverIndexRef.current;
      if (to !== null && to !== from) {
        setNavOrderRef.current(moveItem(navOrderRef.current, from, to));
      }
      dragIndexRef.current = null;
      dragOverIndexRef.current = null;
      setDragIndex(null);
      setDragOverIndex(null);
      setDragDeltaY(0);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  function handleHandlePointerDown(
    index: number,
    e: React.PointerEvent<HTMLButtonElement>,
  ) {
    e.preventDefault();
    dragStartYRef.current = e.clientY;
    rowRectsRef.current = rowRefs.current.map((el) => {
      const rect = el?.getBoundingClientRect();
      return { top: rect?.top ?? 0, height: rect?.height ?? 0 };
    });
    dragIndexRef.current = index;
    dragOverIndexRef.current = index;
    setDragIndex(index);
    setDragOverIndex(index);
    setDragDeltaY(0);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }

  function moveBy(index: number, delta: number) {
    const to = index + delta;
    if (to < 0 || to >= navOrder.length) return;
    setNavOrder(moveItem(navOrder, index, to));
  }

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tc("title")}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
    >
      <div
        ref={panelRef}
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-border bg-background shadow-2xl sm:max-w-sm sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{tc("title")}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc("done")}
            className="rounded p-1.5 text-foreground/50 transition-colors hover:bg-surface hover:text-foreground"
          >
            {closeIcon}
          </button>
        </div>

        <p className="px-4 pt-3 text-xs text-foreground/60">{tc("description")}</p>

        <ul className="flex-1 overflow-y-auto px-2 py-2">
          {navOrder.map((id, index) => {
            const def = NAV_ITEM_DEFS[id];
            const label = t(def.labelKey);
            const isDragging = dragIndex === index;
            const dropIndicator =
              dragOverIndex !== null &&
              dragIndex !== null &&
              dragOverIndex === index &&
              dragOverIndex !== dragIndex
                ? dragOverIndex > dragIndex
                  ? "bottom"
                  : "top"
                : null;

            return (
              <li
                key={id}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                style={
                  isDragging
                    ? { transform: `translateY(${dragDeltaY}px)`, position: "relative", zIndex: 30 }
                    : undefined
                }
                className={`flex items-center gap-2 rounded-lg px-2 py-2 ${
                  isDragging ? "bg-surface opacity-90 shadow-lg" : ""
                } ${dropIndicator === "top" ? "border-t-2 border-t-primary" : ""} ${
                  dropIndicator === "bottom" ? "border-b-2 border-b-primary" : ""
                }`}
              >
                <button
                  type="button"
                  onPointerDown={(e) => handleHandlePointerDown(index, e)}
                  aria-label={tc("dragHandle", { item: label })}
                  className={`touch-none select-none px-1 text-foreground/30 transition-colors hover:text-foreground/70 ${
                    isDragging ? "cursor-grabbing text-foreground/70" : "cursor-grab"
                  }`}
                >
                  ⠿
                </button>

                <span className="flex flex-1 items-center gap-2 text-sm font-medium text-foreground">
                  {def.icon}
                  {label}
                </span>

                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveBy(index, -1)}
                    disabled={index === 0}
                    aria-label={tc("moveUp", { item: label })}
                    className="rounded p-1 leading-none text-foreground/40 transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/40"
                  >
                    {upIcon}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBy(index, 1)}
                    disabled={index === navOrder.length - 1}
                    aria-label={tc("moveDown", { item: label })}
                    className="rounded p-1 leading-none text-foreground/40 transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/40"
                  >
                    {downIcon}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => resetNavOrder()}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-surface hover:text-foreground"
          >
            {tc("resetDefault")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {tc("done")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
