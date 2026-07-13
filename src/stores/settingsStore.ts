import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

interface SettingsState {
  /** Explicit user choice, or null to follow the locale default. */
  hourFormat: HourFormat | null;
  /** City id used by the location card, overriding the auto-detected city. */
  localCardCityId: string | null;
  /** "system" follows the OS preference; "light"/"dark" force a side. */
  theme: Theme;
  /** Sun view (/sun) card toggles — all default off, persisted. */
  sunShowGoldenHour: boolean;
  sunShowTwilight: boolean;
  sunShowMoonPhase: boolean;
  /** True once zustand persist has finished reading localStorage (client-only). */
  hasHydrated: boolean;

  setHourFormat: (format: HourFormat) => void;
  setLocalCardCityId: (cityId: string | null) => void;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  setSunShowGoldenHour: (value: boolean) => void;
  setSunShowTwilight: (value: boolean) => void;
  setSunShowMoonPhase: (value: boolean) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      hourFormat: null,
      localCardCityId: null,
      theme: "system",
      sunShowGoldenHour: false,
      sunShowTwilight: false,
      sunShowMoonPhase: false,
      hasHydrated: false,

      setHourFormat: (format) => set({ hourFormat: format }),
      setLocalCardCityId: (cityId) => set({ localCardCityId: cityId }),
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => set({ theme: nextTheme(get().theme) }),
      setSunShowGoldenHour: (value) => set({ sunShowGoldenHour: value }),
      setSunShowTwilight: (value) => set({ sunShowTwilight: value }),
      setSunShowMoonPhase: (value) => set({ sunShowMoonPhase: value }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "wtz-settings",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        hourFormat: state.hourFormat,
        localCardCityId: state.localCardCityId,
        theme: state.theme,
        sunShowGoldenHour: state.sunShowGoldenHour,
        sunShowTwilight: state.sunShowTwilight,
        sunShowMoonPhase: state.sunShowMoonPhase,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
