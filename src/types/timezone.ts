/** Current UTC offset + naming info for a timezone at a given instant. */
export interface ZoneInfo {
  /** e.g. "BRT", "EST", "GMT+2" */
  abbreviation: string;
  /** e.g. "UTC-3", "UTC+5:30" */
  offsetFormatted: string;
  /** Offset from UTC in minutes (can be negative). */
  offsetMinutes: number;
  isDST: boolean;
}

/** One hour slot in a comparator row's 24h (or N-hour) timeline. */
export interface HourSlot {
  /** ISO string of this slot's instant, for stable keys/debugging. */
  isoString: string;
  /** Hour of day in the target zone, 0-23. */
  hour: number;
  /** Minute offset for the slot (0 for whole-hour zones, else e.g. 30). */
  minute: number;
  /** Short weekday label, e.g. "Mon". */
  weekday: string;
  /** Day of month in the target zone. */
  day: number;
  /** Short month label, e.g. "Jan" (only meaningful alongside isNewDay). */
  month: string;
  isWeekend: boolean;
  /** 22:00–05:59 local time. */
  isNight: boolean;
  /** 09:00–17:59 local time (Mon–Fri implied by isWeekend check at call site). */
  isBusinessHour: boolean;
  /** True when this slot crosses local midnight (start of a new calendar day). */
  isNewDay: boolean;
  /** True when this slot is the "current" hour for the zone (matches now). */
  isNow: boolean;
}
