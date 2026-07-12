"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { useComparatorStore } from "@/stores/comparatorStore";
import { getRowAnchor } from "@/lib/timezone";
import { selectionDurationHours } from "@/lib/timeSelection";
import {
  captureNodeAsPng,
  copyPngToClipboard,
  downloadComparatorPdf,
  downloadComparatorPng,
} from "@/lib/exportComparator";
import { buildShareUrl, readShareLinkParams } from "@/lib/shareLink";
import AddCityButton from "@/components/Search/AddCityButton";
import ActionMenu, { exportIcons } from "@/components/Export/ActionMenu";
import TimezoneRow from "./TimezoneRow";

export default function Comparator() {
  const cities = useComparatorStore((s) => s.cities);
  const referenceDate = useComparatorStore((s) => s.referenceDate);
  const addCity = useComparatorStore((s) => s.addCity);
  const removeCity = useComparatorStore((s) => s.removeCity);
  const reorderCities = useComparatorStore((s) => s.reorderCities);
  const setReferenceDate = useComparatorStore((s) => s.setReferenceDate);
  const initializeDefaultCities = useComparatorStore(
    (s) => s.initializeDefaultCities,
  );
  const selectionStart = useComparatorStore((s) => s.selectionStart);
  const selectionEnd = useComparatorStore((s) => s.selectionEnd);
  const selectSlot = useComparatorStore((s) => s.selectSlot);
  const clearSelection = useComparatorStore((s) => s.clearSelection);
  const hydrateFromShareLink = useComparatorStore(
    (s) => s.hydrateFromShareLink,
  );

  const [now, setNow] = useState(() => DateTime.now());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }

  // ---- Drag-to-reorder state (native pointer events, no external lib) ----
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRectsRef = useRef<{ top: number; height: number }[]>([]);
  const dragStartYRef = useRef(0);
  const dragIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const reorderCitiesRef = useRef(reorderCities);
  reorderCitiesRef.current = reorderCities;

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragDeltaY, setDragDeltaY] = useState(0);

  // One-time client-side hydration: localStorage first, then a share-link
  // URL (if present) overrides it, since it reflects explicit user intent.
  useEffect(() => {
    async function init() {
      await useComparatorStore.persist.rehydrate();

      const shareParams = readShareLinkParams();
      if (shareParams) {
        hydrateFromShareLink(
          shareParams.cityIds,
          shareParams.start,
          shareParams.end,
        );
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        initializeDefaultCities();
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep "now" (and therefore the live clock + hour-tile anchor) fresh.
  useEffect(() => {
    const interval = setInterval(() => setNow(DateTime.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Esc clears the active time-range selection (unless the add-city panel
  // is open, which owns Esc for itself).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !addPanelOpen) clearSelection();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [addPanelOpen, clearSelection]);

  // Global pointer listeners for the active drag, registered once.
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
        reorderCitiesRef.current(from, to);
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

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.order - b.order),
    [cities],
  );

  rowRefs.current = rowRefs.current.slice(0, sortedCities.length);

  const displayInstant = referenceDate
    ? DateTime.fromISO(referenceDate).isValid
      ? DateTime.fromISO(referenceDate)
      : now
    : now;

  const anchor = useMemo(
    () => getRowAnchor(referenceDate, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [referenceDate, now],
  );

  const existingIds = sortedCities.map((c) => c.city.id);

  function handleDateTimeChange(value: string) {
    if (!value) {
      setReferenceDate(null);
      return;
    }
    const dt = DateTime.fromISO(value);
    if (dt.isValid) setReferenceDate(dt.toISO());
  }

  const localDateTimeValue = referenceDate
    ? DateTime.fromISO(referenceDate).toFormat("yyyy-LL-dd'T'HH:mm")
    : "";

  // Briefly reveals the export branding header and waits a frame for layout
  // to settle before handing the node off to html-to-image.
  async function captureExportPng(): Promise<string> {
    const node = exportRef.current;
    if (!node) throw new Error("Export target not found");
    setIsExporting(true);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      return await captureNodeAsPng(node);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleCopyPng() {
    setIsBusy(true);
    try {
      const dataUrl = await captureExportPng();
      const result = await copyPngToClipboard(dataUrl);
      showToast(result === "copied" ? "Copied to clipboard" : "Downloaded (clipboard unavailable)");
    } catch {
      showToast("Couldn't export image");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDownloadPng() {
    setIsBusy(true);
    try {
      const dataUrl = await captureExportPng();
      downloadComparatorPng(dataUrl);
      showToast("PNG downloaded");
    } catch {
      showToast("Couldn't export image");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDownloadPdf() {
    setIsBusy(true);
    try {
      const dataUrl = await captureExportPng();
      await downloadComparatorPdf(dataUrl);
      showToast("PDF downloaded");
    } catch {
      showToast("Couldn't export PDF");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleShareLink() {
    const url = buildShareUrl(sortedCities, selectionStart, selectionEnd);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "World Time Zone", url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        // fall through to clipboard copy below
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    } catch {
      showToast("Couldn't copy link");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Fusos Horários do Mundo
          </h1>
          <p className="text-sm text-foreground/60">
            Compare fusos horários do mundo inteiro e encontre o melhor
            horário para se reunir, onde quer que seu time esteja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectionStart && selectionEnd && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              <span>
                {selectionDurationHours(selectionStart, selectionEnd)}h
                selected
              </span>
              <button
                type="button"
                onClick={clearSelection}
                aria-label="Clear selection"
                title="Clear selection"
                className="rounded p-0.5 leading-none text-primary/70 transition-colors hover:text-primary"
              >
                ×
              </button>
            </div>
          )}
          <ActionMenu
            label="Action"
            busy={isBusy}
            actions={[
              { key: "add-city", label: "Add city", icon: exportIcons.addCity, onSelect: () => setAddPanelOpen(true) },
              { key: "copy-png", label: "Copy PNG", icon: exportIcons.copy, onSelect: handleCopyPng },
              { key: "download-png", label: "Download PNG", icon: exportIcons.downloadImage, onSelect: handleDownloadPng },
              { key: "download-pdf", label: "Download PDF", icon: exportIcons.downloadPdf, onSelect: handleDownloadPdf },
              { key: "share-link", label: "Share link", icon: exportIcons.share, onSelect: handleShareLink },
            ]}
          />
          <input
            type="datetime-local"
            value={localDateTimeValue}
            onChange={(e) => handleDateTimeChange(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            aria-label="Reference date and time"
          />
          {referenceDate && (
            <button
              type="button"
              onClick={() => setReferenceDate(null)}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface"
            >
              Now
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <div className="min-w-max" ref={exportRef}>
          {isExporting && (
            <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
              <span className="text-sm font-semibold text-foreground">
                World Time Zone
              </span>
              <span className="text-xs text-foreground/50">
                {DateTime.now().toFormat("d LLL yyyy, HH:mm")}
              </span>
            </div>
          )}
          {sortedCities.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-foreground/50">
              Add a city with the + button to start comparing time zones.
            </p>
          ) : (
            sortedCities.map((comparedCity, index) => (
              <TimezoneRow
                key={comparedCity.city.id}
                comparedCity={comparedCity}
                anchor={anchor}
                displayInstant={displayInstant}
                hoveredIndex={hoveredIndex}
                onHoverIndex={setHoveredIndex}
                onRemove={removeCity}
                onRequestAdd={() => setAddPanelOpen(true)}
                rowRef={(el) => {
                  rowRefs.current[index] = el;
                }}
                onHandlePointerDown={(e) => handleHandlePointerDown(index, e)}
                isDragging={dragIndex === index}
                dragDeltaY={dragDeltaY}
                onSlotClick={selectSlot}
                selectionStart={selectionStart}
                selectionEnd={selectionEnd}
                dropIndicator={
                  dragIndex !== null &&
                  dragOverIndex === index &&
                  dragIndex !== index
                    ? dragOverIndex < dragIndex
                      ? "top"
                      : "bottom"
                    : null
                }
              />
            ))
          )}
        </div>
      </div>

      <AddCityButton
        onSelect={addCity}
        excludeIds={existingIds}
        open={addPanelOpen}
        onOpenChange={setAddPanelOpen}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
