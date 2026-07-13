/**
 * Solar position calculations for the day/night terminator (Map View).
 * Pure, framework-free, and unit-testable in isolation (no DOM/React).
 *
 * Uses the standard NOAA Solar Calculator equations (geometric mean
 * longitude/anomaly, equation of center, nutation/obliquity correction,
 * equation of time) — accurate to a small fraction of a degree, which is
 * more than enough for a terminator line drawn on a world map.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Julian Day for a given instant — also used by sun.ts for moon-phase age. */
export function toJulianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function normalizeDegrees(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/** Wraps a longitude into [-180, 180]. */
export function normalizeLongitude(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export interface SolarPosition {
  /** Solar declination in degrees — the latitude the sun sits directly over. */
  declinationDeg: number;
  /** Longitude the sun sits directly over, in degrees, normalized to [-180, 180]. */
  subsolarLonDeg: number;
}

/** Computes the sun's declination and subsolar longitude for a given instant. */
export function getSolarPosition(date: Date): SolarPosition {
  const jd = toJulianDay(date);
  const T = (jd - 2451545.0) / 36525;

  const L0 = normalizeDegrees(280.46646 + T * (36000.76983 + T * 0.0003032));
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  const Mrad = M * DEG;
  const C =
    Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mrad) * 0.000289;

  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG);

  const epsilon0 =
    23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const epsilon = epsilon0 + 0.00256 * Math.cos(omega * DEG);

  const declinationDeg =
    Math.asin(Math.sin(epsilon * DEG) * Math.sin(lambda * DEG)) * RAD;

  const y = Math.pow(Math.tan((epsilon / 2) * DEG), 2);
  const eqTimeMin =
    4 *
    RAD *
    (y * Math.sin(2 * L0 * DEG) -
      2 * e * Math.sin(Mrad) +
      4 * e * y * Math.sin(Mrad) * Math.cos(2 * L0 * DEG) -
      0.5 * y * y * Math.sin(4 * L0 * DEG) -
      1.25 * e * e * Math.sin(2 * Mrad));

  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  const subsolarLonDeg = normalizeLongitude(-15 * (utcHours - 12) - eqTimeMin / 4);

  return { declinationDeg, subsolarLonDeg };
}

/** The latitude of the day/night terminator at a given longitude, for a given solar position. */
export function terminatorLatitude(lonDeg: number, solar: SolarPosition): number {
  const dec = solar.declinationDeg * DEG;
  const H = (lonDeg - solar.subsolarLonDeg) * DEG;
  const y = -Math.cos(dec) * Math.cos(H);
  const x = Math.sin(dec);
  return Math.atan2(y, x) * RAD;
}

/**
 * Builds the night-side polygon as a list of [lon, lat] points (degrees):
 * the terminator curve traced across every longitude, then closed off
 * along whichever pole is in darkness, ready for a caller to project onto
 * an equirectangular map (see src/components/Map/projection.ts).
 */
export function buildNightPolygon(date: Date, steps = 181): Array<[number, number]> {
  const solar = getSolarPosition(date);
  const points: Array<[number, number]> = [];

  for (let i = 0; i <= steps; i++) {
    const lon = -180 + (360 * i) / steps;
    points.push([lon, terminatorLatitude(lon, solar)]);
  }

  // Close the polygon along the pole that's in darkness: south pole when
  // the sun is north of the equator (declination >= 0), north pole otherwise.
  const darkPoleLat = solar.declinationDeg >= 0 ? -90 : 90;
  points.push([180, darkPoleLat]);
  points.push([-180, darkPoleLat]);

  return points;
}
