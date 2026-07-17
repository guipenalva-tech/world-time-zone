import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { DEFAULT_NAV_ORDER, NAV_IDS, reconcileNavOrder, type NavId } from "@/lib/navOrder";

export type HourFormat = "12" | "24";

export type Theme = "system" | "light" | "dark";

const THEME_CYCLE: Record<Theme, Theme> = {
  system: "light",
  light: "dark",
  dark: "system",
};

/** Returns the next theme in the system -> light -> dark -> system cycle. */
export function nextTheme(current: Theme): Theme {
  return THEME_CYCLE[current];
}

/** Default hour format per locale, used until the user explicitly overrides it. */
const LOCALE_DEFAULT_HOUR_FORMAT: Record<string, HourFormat> = {
  en: "12",
  hi: "12",
  pt: "24",
  es: "24",
  fr: "24",
  de: "24",
};

export function defaultHourFormat(locale: string): HourFormat {
  return LOCALE_DEFAULT_HOUR_FORMAT[locale] ?? "24";
}

/** Resolves the effective hour format: the user's explicit choice, or the locale default. */
export function resolveHourFormat(
  stored: HourFormat | null,
  locale: string,
): HourFormat {
  return stored ?? defaultHourFormat(locale);
}

/**
 * Plain localStorage-backed JSON storage, like `createJSONStorage(() =>
 * localStorage)`, but stamps a `version: 0` onto any persisted payload
 * that doesn't already carry a numeric `version` field. Zustand's persist
 * middleware only invokes `migrate` when `typeof storedValue.version ===
 * "number"` — every browser that saved settings before this file
 * introduced `version`/`migrate` has no such field at all, so without
 * this shim `migrate` would silently never run for them and the
 * golden-hour/twilight/moon-phase defaults would stay stuck on the old
 * `false` forever.
 */
function createMigratingStorage<S>(): PersistStorage<S> {
  return {
    getItem: (name) => {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StorageValue<S> & { version?: number };
      if (typeof parsed.version !== "number") {
        parsed.version = 0;
      }
      return parsed;
    },
    setItem: (name, value) => {
      localStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: (name) => {
      localStorage.removeItem(name);
    },
  };
}

interface SettingsState {
  /** Explicit user choice, or null to follow the locale default. */
  hourFormat: HourFormat | null;
  /** City id used by the location card, overriding the auto-detected city. */
  localCardCityId: string | null;
  /** "system" follows the OS preference; "light"/"dark" force a side. */
  theme: Theme;
  /** Sun view (/sun) card toggles — all default on, persisted. */
  sunShowGoldenHour: boolean;
  sunShowTwilight: boolean;
  sunShowMoonPhase: boolean;
  /**
   * User-customized order of the 9 top-level nav routes (route paths as
   * ids). Reconciled against `NAV_IDS` on every rehydration — see
   * `reconcileNavOrder` in `@/lib/navOrder` — so adding or removing a nav
   * route later doesn't require another store version bump.
   */
  navOrder: NavId[];
  /** True once zustand persist has finished reading localStorage (client-only). */
  hasHydrated: boolean;

  setHourFormat: (format: HourFormat) => void;
  setLocalCardCityId: (cityId: string | null) => void;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  setSunShowGoldenHour: (value: boolean) => void;
  setSunShowTwilight: (value: boolean) => void;
  setSunShowMoonPhase: (value: boolean) => void;
  setNavOrder: (order: NavId[]) => void;
  resetNavOrder: () => void;
  setHasHydrated: (value: boolean) => void;
}

/** The subset of SettingsState actually written to localStorage (see `partialize` below). */
type PersistedSettings = Pick<
  SettingsState,
  | "hourFormat"
  | "localCardCityId"
  | "theme"
  | "sunShowGoldenHour"
  | "sunShowTwilight"
  | "sunShowMoonPhase"
  | "navOrder"
>;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      hourFormat: null,
      localCardCityId: null,
      theme: "system",
      sunShowGoldenHour: true,
      sunShowTwilight: true,
      sunShowMoonPhase: true,
      navOrder: DEFAULT_NAV_ORDER,
      hasHydrated: false,

      setHourFormat: (format) => set({ hourFormat: format }),
      setLocalCardCityId: (cityId) => set({ localCardCityId: cityId }),
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => set({ theme: nextTheme(get().theme) }),
      setSunShowGoldenHour: (value) => set({ sunShowGoldenHour: value }),
      setSunShowTwilight: (value) => set({ sunShowTwilight: value }),
      setSunShowMoonPhase: (value) => set({ sunShowMoonPhase: value }),
      setNavOrder: (order) => set({ navOrder: reconcileNavOrder(order, NAV_IDS) }),
      resetNavOrder: () => set({ navOrder: DEFAULT_NAV_ORDER }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "wtz-settings",
      storage: createMigratingStorage<PersistedSettings>(),
      skipHydration: true,
      // Bumped when the sun-filter defaults flipped from off to on (all
      // three filters below). Existing localStorage from before this
      // version has no explicit user intent recorded for these three
      // keys (there was no other way to reach `false` than the old
      // default), so migrating them to `true` here is safe and only
      // runs once per browser — any later explicit toggle by the user
      // is untouched since it happens after rehydration.
      //
      // v2 added `navOrder` (user-customizable nav bar order). Storage
      // from before v2 has no `navOrder` key at all, so it's seeded with
      // the default order here. Beyond that one-time seed, `navOrder` is
      // also reconciled against `NAV_IDS` on every rehydration (see
      // `onRehydrateStorage` below) — that's what handles routes being
      // added or removed later, without needing a v3 bump.
      version: 2,
      migrate: (persistedState, version) => {
        const state = persistedState as PersistedSettings;
        // `version` is `undefined` (not `0`) for storage written before this
        // field existed at all — `undefined < 1` is `false` in JS, so the
        // comparison must normalize that case first or pre-existing
        // localStorage silently skips the migration below.
        let next = state;
        if ((version ?? 0) < 1) {
          next = {
            ...next,
            sunShowGoldenHour: true,
            sunShowTwilight: true,
            sunShowMoonPhase: true,
          };
        }
        if ((version ?? 0) < 2) {
          next = {
            ...next,
            navOrder: DEFAULT_NAV_ORDER,
          };
        }
        return next;
      },
      partialize: (state) => ({
        hourFormat: state.hourFormat,
        localCardCityId: state.localCardCityId,
        theme: state.theme,
        sunShowGoldenHour: state.sunShowGoldenHour,
        sunShowTwilight: state.sunShowTwilight,
        sunShowMoonPhase: state.sunShowMoonPhase,
        navOrder: state.navOrder,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reconcile every rehydration (not just the v1→v2 migration
          // above) so a future page add/remove is handled automatically:
          // unknown ids are dropped, new ids are appended at the end.
          state.setNavOrder(reconcileNavOrder(state.navOrder, NAV_IDS));
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);
