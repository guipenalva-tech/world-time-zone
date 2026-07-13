import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AlarmRepeat = "once" | "daily";

/** Exact set of lead times the business-hours form offers, in minutes. */
export const BUSINESS_HOURS_LEAD_OPTIONS = [
  15, 30, 45, 60, 120, 180, 240, 300, 360, 420,
] as const;
export type BusinessHoursLeadMinutes = (typeof BUSINESS_HOURS_LEAD_OPTIONS)[number];

export interface CityAlarm {
  id: string;
  cityId: string;
  hour: number;
  minute: number;
  repeat: AlarmRepeat;
  enabled: boolean;
  /** ISO (UTC) of the occurrence last fired, or null if never fired —
   * dedupes repeated ticks and (for "once" alarms) marks it as completed. */
  lastFiredKey: string | null;
  createdISO: string;
}

export interface BusinessHoursAlert {
  id: string;
  cityId: string;
  leadMinutes: BusinessHoursLeadMinutes;
  enabled: boolean;
  lastFiredKey: string | null;
  createdISO: string;
}

/** Per-city record of which DST reminder/moment instants have already
 * notified, keyed by the transition's ISO instant so it naturally resets
 * once a new (future) transition is detected. */
interface DstFiredKeys {
  reminderKey: string | null;
  momentKey: string | null;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface AlertsState {
  /** cityId -> whether DST-transition notifications are on for that city. */
  dstNotify: Record<string, boolean>;
  dstFired: Record<string, DstFiredKeys>;
  cityAlarms: CityAlarm[];
  businessHoursAlerts: BusinessHoursAlert[];
  /** True once zustand persist has finished reading localStorage (client-only). */
  hasHydrated: boolean;

  setDstNotify: (cityId: string, value: boolean) => void;
  markDstFired: (cityId: string, kind: "reminder" | "moment", key: string) => void;

  addCityAlarm: (input: {
    cityId: string;
    hour: number;
    minute: number;
    repeat: AlarmRepeat;
  }) => void;
  updateCityAlarm: (
    id: string,
    patch: Partial<Pick<CityAlarm, "hour" | "minute" | "repeat" | "enabled">>,
  ) => void;
  removeCityAlarm: (id: string) => void;
  markCityAlarmFired: (id: string, key: string) => void;

  addBusinessHoursAlert: (input: {
    cityId: string;
    leadMinutes: BusinessHoursLeadMinutes;
  }) => void;
  updateBusinessHoursAlert: (
    id: string,
    patch: Partial<Pick<BusinessHoursAlert, "leadMinutes" | "enabled">>,
  ) => void;
  removeBusinessHoursAlert: (id: string) => void;
  markBusinessHoursFired: (id: string, key: string) => void;

  setHasHydrated: (value: boolean) => void;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      dstNotify: {},
      dstFired: {},
      cityAlarms: [],
      businessHoursAlerts: [],
      hasHydrated: false,

      setDstNotify: (cityId, value) =>
        set({ dstNotify: { ...get().dstNotify, [cityId]: value } }),

      markDstFired: (cityId, kind, key) => {
        const current = get().dstFired[cityId] ?? {
          reminderKey: null,
          momentKey: null,
        };
        set({
          dstFired: {
            ...get().dstFired,
            [cityId]: {
              ...current,
              [kind === "reminder" ? "reminderKey" : "momentKey"]: key,
            },
          },
        });
      },

      addCityAlarm: ({ cityId, hour, minute, repeat }) => {
        const alarm: CityAlarm = {
          id: makeId(),
          cityId,
          hour,
          minute,
          repeat,
          enabled: true,
          lastFiredKey: null,
          createdISO: new Date().toISOString(),
        };
        set({ cityAlarms: [...get().cityAlarms, alarm] });
      },

      updateCityAlarm: (id, patch) => {
        set({
          cityAlarms: get().cityAlarms.map((a) =>
            a.id === id
              ? {
                  ...a,
                  ...patch,
                  // Editing the time/repeat of a completed "once" alarm
                  // re-arms it instead of leaving it permanently fired.
                  lastFiredKey:
                    patch.hour !== undefined ||
                    patch.minute !== undefined ||
                    patch.repeat !== undefined
                      ? null
                      : a.lastFiredKey,
                }
              : a,
          ),
        });
      },

      removeCityAlarm: (id) => {
        set({ cityAlarms: get().cityAlarms.filter((a) => a.id !== id) });
      },

      markCityAlarmFired: (id, key) => {
        set({
          cityAlarms: get().cityAlarms.map((a) =>
            a.id === id ? { ...a, lastFiredKey: key } : a,
          ),
        });
      },

      addBusinessHoursAlert: ({ cityId, leadMinutes }) => {
        const alert: BusinessHoursAlert = {
          id: makeId(),
          cityId,
          leadMinutes,
          enabled: true,
          lastFiredKey: null,
          createdISO: new Date().toISOString(),
        };
        set({ businessHoursAlerts: [...get().businessHoursAlerts, alert] });
      },

      updateBusinessHoursAlert: (id, patch) => {
        set({
          businessHoursAlerts: get().businessHoursAlerts.map((a) =>
            a.id === id ? { ...a, ...patch } : a,
          ),
        });
      },

      removeBusinessHoursAlert: (id) => {
        set({
          businessHoursAlerts: get().businessHoursAlerts.filter((a) => a.id !== id),
        });
      },

      markBusinessHoursFired: (id, key) => {
        set({
          businessHoursAlerts: get().businessHoursAlerts.map((a) =>
            a.id === id ? { ...a, lastFiredKey: key } : a,
          ),
        });
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "wtz-alerts",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        dstNotify: state.dstNotify,
        dstFired: state.dstFired,
        cityAlarms: state.cityAlarms,
        businessHoursAlerts: state.businessHoursAlerts,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
