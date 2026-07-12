import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DateTime } from "luxon";
import type { City } from "@/types/city";
import type { ComparedCity } from "@/types/city";
import { getCityById, findCityByTimezone } from "@/lib/cities";

const DEFAULT_CITY_IDS = ["london", "new-york", "tokyo"];

function defaultCities(): ComparedCity[] {
  return DEFAULT_CITY_IDS.map((id) => getCityById(id))
    .filter((c): c is City => Boolean(c))
    .map((city, order) => ({ city, order }));
}

function reindex(cities: ComparedCity[]): ComparedCity[] {
  return cities.map((c, order) => ({ ...c, order }));
}

function validIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return DateTime.fromISO(iso).isValid ? iso : null;
}

interface ComparatorState {
  cities: ComparedCity[];
  /** ISO date string used as the comparator's reference point, or null for "now" (live). */
  referenceDate: string | null;
  /** Whether the one-time "seed with detected city" step has already run. */
  initialized: boolean;
  /** True once zustand persist has finished reading localStorage (client-only). */
  hasHydrated: boolean;
  /** Selected time-range bounds, as absolute-instant ISO strings (hour-slot aligned). */
  selectionStart: string | null;
  selectionEnd: string | null;

  addCity: (city: City) => void;
  removeCity: (cityId: string) => void;
  reorderCities: (from: number, to: number) => void;
  setReferenceDate: (iso: string | null) => void;
  /** Seeds the list with the user's detected city, once, if not already done. */
  initializeDefaultCities: () => void;
  setHasHydrated: (value: boolean) => void;
  /** Two-click range selection: first click sets start, second sets end (swapped if reversed). */
  selectSlot: (iso: string) => void;
  clearSelection: () => void;
  /** Replaces the whole comparator state from a share-link URL (takes precedence over localStorage). */
  hydrateFromShareLink: (
    cityIds: string[],
    startIso: string | null,
    endIso: string | null,
  ) => void;
}

export const useComparatorStore = create<ComparatorState>()(
  persist(
    (set, get) => ({
      cities: defaultCities(),
      referenceDate: null,
      initialized: false,
      hasHydrated: false,
      selectionStart: null,
      selectionEnd: null,

      addCity: (city) => {
        const { cities } = get();
        if (cities.some((c) => c.city.id === city.id)) return;
        set({ cities: reindex([...cities, { city, order: cities.length }]) });
      },

      removeCity: (cityId) => {
        const { cities } = get();
        set({ cities: reindex(cities.filter((c) => c.city.id !== cityId)) });
      },

      reorderCities: (from, to) => {
        const { cities } = get();
        if (
          from === to ||
          from < 0 ||
          to < 0 ||
          from >= cities.length ||
          to >= cities.length
        ) {
          return;
        }
        const next = [...cities];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        set({ cities: reindex(next) });
      },

      setReferenceDate: (iso) => set({ referenceDate: iso }),

      initializeDefaultCities: () => {
        if (get().initialized) return;
        set({ initialized: true });

        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const detected = findCityByTimezone(tz);
          if (!detected) return;

          const { cities } = get();
          if (cities.some((c) => c.city.id === detected.id)) return;

          set({
            cities: reindex([{ city: detected, order: 0 }, ...cities]),
          });
        } catch {
          // Intl API unavailable or zone lookup failed — keep the static defaults.
        }
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),

      selectSlot: (iso) => {
        const { selectionStart, selectionEnd } = get();
        // No selection yet, or a complete one already exists — start fresh.
        if (!selectionStart || selectionEnd) {
          set({ selectionStart: iso, selectionEnd: null });
          return;
        }
        // Second click: close the range, swapping if it lands before the start.
        const isoMs = DateTime.fromISO(iso).toMillis();
        const startMs = DateTime.fromISO(selectionStart).toMillis();
        if (isoMs < startMs) {
          set({ selectionStart: iso, selectionEnd: selectionStart });
        } else {
          set({ selectionEnd: iso });
        }
      },

      clearSelection: () => set({ selectionStart: null, selectionEnd: null }),

      hydrateFromShareLink: (cityIds, startIso, endIso) => {
        const resolved = cityIds
          .map((id) => getCityById(id))
          .filter((c): c is City => Boolean(c));
        if (resolved.length === 0) return;

        set({
          cities: reindex(resolved.map((city) => ({ city, order: 0 }))),
          initialized: true,
          selectionStart: validIso(startIso),
          selectionEnd: validIso(endIso),
        });
      },
    }),
    {
      name: "wtz-comparator",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        cities: state.cities,
        referenceDate: state.referenceDate,
        initialized: state.initialized,
        selectionStart: state.selectionStart,
        selectionEnd: state.selectionEnd,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
