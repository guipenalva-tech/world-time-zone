"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { useComparatorStore } from "@/stores/comparatorStore";
import { getRowAnchor } from "@/lib/timezone";
import AddCityButton from "@/components/Search/AddCityButton";
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

  const [now, setNow] = useState(() => DateTime.now());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  // One-time client-side hydration + detected-city seeding.
  useEffect(() => {
    useComparatorStore.persist.rehydrate();
    initializeDefaultCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep "now" (and therefore the live clock + hour-tile anchor) fresh.
  useEffect(() => {
    const interval = setInterval(() => setNow(DateTime.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Time zone comparator</h1>
          <p className="text-sm text-foreground/60">
            Hover a column to compare the same hour everywhere.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
        <div className="min-w-max">
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
                rowRef={(el) => {
                  rowRefs.current[index] = el;
                }}
                onHandlePointerDown={(e) => handleHandlePointerDown(index, e)}
                isDragging={dragIndex === index}
                dragDeltaY={dragDeltaY}
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

      <AddCityButton onSelect={addCity} excludeIds={existingIds} />
    </div>
  );
}
