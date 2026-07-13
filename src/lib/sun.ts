/**
 * Sunrise/sunset, twilight, golden hour, and moon-phase calculations for
 * the Sunrise & Sunset view (/sun). Pure, framework-free, and
 * unit-testable in isolation (no DOM/React) — builds directly on the NOAA
 * solar position equations already in solar.ts (declination + the
 * equation-of-time-corrected subsolar longitude) instead of re-deriving
 * them, matching the standard NOAA/"sunrise equation" hour-angle method:
 * https://en.wikipedia.org/wiki/Sunrise_equation
 */
import { DateTime } from "luxon";
import { getSolarPosition, normalizeLongitude, toJulianDay } from "./solar";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Standard altitude thresholds (degrees), sun center relative to the horizon. */
const ALT_SUNRISE_SUNSET = -0.833; // atmospheric refraction + apparent solar radius
const ALT_CIVIL = -6;
const ALT_NAUTICAL = -12;
const ALT_ASTRONOMICAL = -18;
const ALT_GOLDEN = 6;

export type SolarEventState = "normal" | "alwaysAbove" | "alwaysBelow";

interface AltitudeEvent {
  /** Hour angle (degrees from solar noon) at which the sun crosses this
   * altitude, or null if it never does that day. */
  hourAngleDeg: number | null;
  state: SolarEventState;
}

/**
 * Solves the "sunrise equation" for the hour angle at which the sun
 * crosses a given altitude, for a location at `lat` with the sun's
 * declination `decDeg`:
 *
 *   cos(H0) = (sin(alt) - sin(lat)*sin(dec)) / (cos(lat)*cos(dec))
 *
 * `cos(H0) > 1` means the sun's highest point that day never reaches
 * `altDeg` (e.g. asking for sunrise during polar night) — "alwaysBelow".
 * `cos(H0) < -1` means the sun's lowest point never dips below `altDeg`
 * (e.g. asking for sunset during the midnight sun) — "alwaysAbove".
 */
function altitudeHourAngle(lat: number, decDeg: number, altDeg: number): AltitudeEvent {
  const latRad = lat * DEG;
  const decRad = decDeg * DEG;
  const altRad = altDeg * DEG;
  const cosH =
    (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));

  if (cosH > 1) return { hourAngleDeg: null, state: "alwaysBelow" };
  if (cosH < -1) return { hourAngleDeg: null, state: "alwaysAbove" };
  return { hourAngleDeg: Math.acos(cosH) * RAD, state: "normal" };
}

/**
 * Solar noon (as a UTC instant) and the sun's declination for a given
 * local calendar date at `lon`. Starts from a clock-time noon guess and
 * refines it against the true subsolar longitude (which already bakes in
 * the equation of time) — converges to sub-second precision in 2-3 steps
 * since each correction shrinks by roughly the change in the equation of
 * time over a few minutes.
 */
function solarNoonAndDeclination(
  dateISO: string,
  tz: string,
  lon: number,
): { noon: DateTime; declinationDeg: number } {
  let guess = DateTime.fromISO(dateISO, { zone: tz }).set({
    hour: 12,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  if (!guess.isValid) {
    guess = DateTime.now().setZone(tz).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  }

  let t = guess;
  let declinationDeg = 0;
  for (let i = 0; i < 3; i++) {
    const solar = getSolarPosition(t.toJSDate());
    declinationDeg = solar.declinationDeg;
    // Hour angle right now at this longitude: 0 at true solar noon,
    // positive in the afternoon. Nudge the guess toward H=0.
    const hourAngleNow = normalizeLongitude(lon - solar.subsolarLonDeg);
    t = t.minus({ hours: hourAngleNow / 15 });
  }

  return { noon: t, declinationDeg };
}

function eventTime(noon: DateTime, hourAngleDeg: number | null, sign: 1 | -1): DateTime | null {
  if (hourAngleDeg === null) return null;
  return noon.plus({ hours: (sign * hourAngleDeg) / 15 });
}

export interface TwilightBand {
  /** Morning crossing (sun ascending through this altitude). */
  dawn: DateTime | null;
  /** Evening crossing (sun descending through this altitude). */
  dusk: DateTime | null;
  state: SolarEventState;
}

function band(noon: DateTime, lat: number, dec: number, altDeg: number): TwilightBand {
  const ev = altitudeHourAngle(lat, dec, altDeg);
  return {
    dawn: eventTime(noon, ev.hourAngleDeg, -1),
    dusk: eventTime(noon, ev.hourAngleDeg, 1),
    state: ev.state,
  };
}

export interface GoldenHourWindow {
  start: DateTime | null;
  end: DateTime | null;
}

export interface SunTimes {
  dateISO: string;
  timezone: string;
  /** Local solar noon (sun at its highest point that day). */
  solarNoon: DateTime;
  declinationDeg: number;
  sunrise: DateTime | null;
  sunset: DateTime | null;
  /** State of the standard sunrise/sunset (-0.833°) threshold: "alwaysAbove"
   * means the midnight sun (sun never sets); "alwaysBelow" means polar
   * night (sun never rises). */
  daylightState: SolarEventState;
  dayLengthMinutes: number;
  civil: TwilightBand;
  nautical: TwilightBand;
  astronomical: TwilightBand;
  /** Morning golden hour: sunrise until the sun climbs past 6° altitude. */
  goldenHourMorning: GoldenHourWindow;
  /** Evening golden hour: sun descending past 6° altitude until sunset. */
  goldenHourEvening: GoldenHourWindow;
}

/**
 * Sunrise, sunset, solar noon, day length, the three twilight bands
 * (civil/nautical/astronomical dawn & dusk), and the two golden-hour
 * windows for a location on a given local calendar date.
 *
 * Handles the midnight-sun / polar-night edge cases: when the sun never
 * crosses a given altitude threshold that day, the corresponding
 * dawn/dusk (or sunrise/sunset) fields are null and the band/daylight
 * `state` reports "alwaysAbove" (sun never sets) or "alwaysBelow" (sun
 * never rises) instead of a bogus time.
 */
export function getSunTimes(lat: number, lon: number, dateISO: string, tz: string): SunTimes {
  const { noon, declinationDeg } = solarNoonAndDeclination(dateISO, tz, lon);

  const daylight = altitudeHourAngle(lat, declinationDeg, ALT_SUNRISE_SUNSET);
  const sunrise = eventTime(noon, daylight.hourAngleDeg, -1);
  const sunset = eventTime(noon, daylight.hourAngleDeg, 1);

  let dayLengthMinutes: number;
  if (daylight.state === "alwaysAbove") dayLengthMinutes = 24 * 60;
  else if (daylight.state === "alwaysBelow") dayLengthMinutes = 0;
  else dayLengthMinutes = (sunset!.toMillis() - sunrise!.toMillis()) / 60_000;

  // Golden hour only makes sense bracketed by an actual sunrise/sunset; on
  // always-above/always-below days (or if the sun's arc never reaches 6°)
  // it collapses to "no window" rather than a nonsensical one.
  const golden = altitudeHourAngle(lat, declinationDeg, ALT_GOLDEN);
  const goldenAscend = golden.state === "normal" ? eventTime(noon, golden.hourAngleDeg, -1) : null;
  const goldenDescend = golden.state === "normal" ? eventTime(noon, golden.hourAngleDeg, 1) : null;

  return {
    dateISO,
    timezone: tz,
    solarNoon: noon,
    declinationDeg,
    sunrise,
    sunset,
    daylightState: daylight.state,
    dayLengthMinutes,
    civil: band(noon, lat, declinationDeg, ALT_CIVIL),
    nautical: band(noon, lat, declinationDeg, ALT_NAUTICAL),
    astronomical: band(noon, lat, declinationDeg, ALT_ASTRONOMICAL),
    goldenHourMorning: { start: sunrise, end: goldenAscend },
    goldenHourEvening: { start: goldenDescend, end: sunset },
  };
}

/**
 * The sun's current altitude (degrees above the horizon, negative below)
 * at `lat`, given the day's solar noon and declination already computed
 * by {@link getSunTimes}. Used for the day-arc's "sun now" tooltip — a
 * one-line elevation readout, not a full position (no azimuth).
 *
 * Standard altitude formula: sin(alt) = sin(lat)sin(dec) +
 * cos(lat)cos(dec)cos(H), where H is the hour angle (degrees from solar
 * noon, derived here from the clock-time offset from `solarNoon`).
 */
export function sunAltitudeDeg(lat: number, now: DateTime, solarNoon: DateTime, declinationDeg: number): number {
  const hourAngleDeg = now.diff(solarNoon, "hours").hours * 15;
  const latRad = lat * DEG;
  const decRad = declinationDeg * DEG;
  const hRad = hourAngleDeg * DEG;
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hRad);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;
}

// --- Moon phase --------------------------------------------------------

export type MoonPhaseName =
  | "newMoon"
  | "waxingCrescent"
  | "firstQuarter"
  | "waxingGibbous"
  | "fullMoon"
  | "waningGibbous"
  | "lastQuarter"
  | "waningCrescent";

export interface MoonPhase {
  /** Fraction of the current ~29.53-day synodic cycle elapsed, [0, 1). */
  age: number;
  /** Fraction of the moon's visible disk illuminated, [0, 1]. */
  illuminatedFraction: number;
  phase: MoonPhaseName;
  emoji: string;
  /** Next full moon / new moon, as UTC ISO date strings. */
  nextFullMoon: string;
  nextNewMoon: string;
}

/** Mean synodic month (new moon to new moon), in days. */
const SYNODIC_MONTH_DAYS = 29.530588853;
/** A known reference new moon: 2000-01-06 18:14 UTC, as a Julian Day. */
const KNOWN_NEW_MOON_JD = 2451550.26;

const PHASE_ORDER: MoonPhaseName[] = [
  "newMoon",
  "waxingCrescent",
  "firstQuarter",
  "waxingGibbous",
  "fullMoon",
  "waningGibbous",
  "lastQuarter",
  "waningCrescent",
];

const PHASE_EMOJI: Record<MoonPhaseName, string> = {
  newMoon: "🌑",
  waxingCrescent: "🌒",
  firstQuarter: "🌓",
  waxingGibbous: "🌔",
  fullMoon: "🌕",
  waningGibbous: "🌖",
  lastQuarter: "🌗",
  waningCrescent: "🌘",
};

/** Buckets a cycle-age fraction into one of 8 equal slices, centered on
 * the slice's nominal age (e.g. "fullMoon" centered on age = 0.5). */
function phaseNameForAge(ageFraction: number): MoonPhaseName {
  const index = Math.floor(ageFraction * 8 + 0.5) % 8;
  return PHASE_ORDER[index];
}

/**
 * The moon's phase for a given calendar date — evaluated at UTC noon of
 * that date (not in any particular timezone), so every city card viewing
 * the "same day" shows the identical, globally-coherent phase.
 */
export function getMoonPhase(dateISO: string): MoonPhase {
  let base = DateTime.fromISO(dateISO, { zone: "utc" });
  if (!base.isValid) base = DateTime.utc();
  const jd = toJulianDay(base.set({ hour: 12 }).toJSDate());

  const daysSinceNew = jd - KNOWN_NEW_MOON_JD;
  const cycles = daysSinceNew / SYNODIC_MONTH_DAYS;
  const age = cycles - Math.floor(cycles); // normalized to [0, 1)
  const illuminatedFraction = (1 - Math.cos(2 * Math.PI * age)) / 2;
  const phase = phaseNameForAge(age);

  const daysIntoCycle = age * SYNODIC_MONTH_DAYS;
  const daysToFull =
    (SYNODIC_MONTH_DAYS / 2 - daysIntoCycle + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const daysToNew = (SYNODIC_MONTH_DAYS - daysIntoCycle + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;

  return {
    age,
    illuminatedFraction,
    phase,
    emoji: PHASE_EMOJI[phase],
    nextFullMoon: base.plus({ days: daysToFull }).toISODate() ?? dateISO,
    nextNewMoon: base.plus({ days: daysToNew }).toISODate() ?? dateISO,
  };
}
