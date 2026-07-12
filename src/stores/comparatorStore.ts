import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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

interface ComparatorState {
  cities: ComparedCity[];
  /** ISO date string used as the comparator's reference point, or null for "now" (live). */
  referenceDate: string | null;
  /** Whether the one-time "seed with detected city" step has already run. */
  initialized: boolean;
  /** True once zustand persist has finished reading localStorage (client-only). */
  hasHydrated: boolean;

  addCity: (city: City) => void;
  removeCity: (cityId: string) => void;
  reorderCities: (from: number, to: number) => void;
  setReferenceDate: (iso: string | null) => void;
  /** Seeds the list with the user's detected city, once, if not already done. */
  initializeDefaultCities: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useComparatorStore = create<ComparatorState>()(
  persist(
    (set, get) => ({
      cities: defaultCities(),
      referenceDate: null,
      initialized: false,
      hasHydrated: false,

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
    }),
    {
      name: "wtz-comparator",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        cities: state.cities,
        referenceDate: state.referenceDate,
        initialized: state.initialized,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
