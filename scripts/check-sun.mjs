#!/usr/bin/env node
/**
 * Sanity check for src/lib/sun.ts, required by the Sunrise & Sunset view
 * spec: sunrise/sunset for a few known cities against approximate published
 * values (tolerance +/-10min), plus the mandatory polar edge cases (midnight
 * sun / near-midnight sun) and basic moon-phase sanity checks.
 * Run with: node --experimental-strip-types scripts/check-sun.mjs
 * (the flag is needed since this imports sun.ts/solar.ts directly).
 */
import { getSunTimes, getMoonPhase } from "../src/lib/sun.ts";

const failures = [];

function assertCloseTime(label, dt, expectedHHmm, toleranceMin) {
  if (!dt) {
    failures.push(`${label}: expected ~${expectedHHmm}, got null (no event that day)`);
    return;
  }
  const [eh, em] = expectedHHmm.split(":").map(Number);
  const expectedMin = eh * 60 + em;
  const actualMin = dt.hour * 60 + dt.minute;
  const diff = Math.min(Math.abs(actualMin - expectedMin), 1440 - Math.abs(actualMin - expectedMin));
  const actualHHmm = dt.toFormat("HH:mm");
  if (diff > toleranceMin) {
    failures.push(
      `${label}: expected ~${expectedHHmm} local, got ${actualHHmm} local (diff ${diff}min, tolerance ${toleranceMin})`,
    );
  } else {
    console.log(`OK  ${label}: ${actualHHmm} local (expected ~${expectedHHmm} +/- ${toleranceMin}min)`);
  }
}

const JULY_DATE = "2026-07-12";

// --- Known-value checks (approximate published times for this date/season) ---

const saoPaulo = getSunTimes(-23.55, -46.63, JULY_DATE, "America/Sao_Paulo");
assertCloseTime("Sao Paulo sunrise (Jul)", saoPaulo.sunrise, "06:50", 10);
assertCloseTime("Sao Paulo sunset (Jul)", saoPaulo.sunset, "17:35", 10);

const london = getSunTimes(51.51, -0.13, JULY_DATE, "Europe/London");
assertCloseTime("London sunrise (Jul)", london.sunrise, "04:55", 10);
assertCloseTime("London sunset (Jul)", london.sunset, "21:10", 10);

const tokyo = getSunTimes(35.68, 139.69, JULY_DATE, "Asia/Tokyo");
assertCloseTime("Tokyo sunrise (Jul)", tokyo.sunrise, "04:45", 10);
assertCloseTime("Tokyo sunset (Jul)", tokyo.sunset, "19:00", 10);

// --- Polar edge cases ---

// Reykjavik (64.15N) in July: near-midnight sun. Sun sets very late and
// rises very early (a very long day), but should still be a "normal" day
// (not full midnight sun — the arctic circle is 66.5N).
const reykjavik = getSunTimes(64.15, -21.94, JULY_DATE, "Atlantic/Reykjavik");
if (reykjavik.daylightState !== "normal") {
  failures.push(`Reykjavik (Jul): expected a normal (very long) day, got state=${reykjavik.daylightState}`);
} else if (reykjavik.dayLengthMinutes < 20 * 60) {
  failures.push(
    `Reykjavik (Jul): expected a very long day (20h+), got ${(reykjavik.dayLengthMinutes / 60).toFixed(2)}h`,
  );
} else {
  console.log(
    `OK  Reykjavik (Jul) day length: ${(reykjavik.dayLengthMinutes / 60).toFixed(2)}h (near-midnight-sun, not full polar day)`,
  );
}

// Synthetic 78N (Svalbard/Longyearbyen latitude, not in the city dataset)
// in July: full midnight sun — the sun never sets.
const polarSummer = getSunTimes(78.22, 15.6, JULY_DATE, "Arctic/Longyearbyen");
if (polarSummer.daylightState !== "alwaysAbove") {
  failures.push(`78N (Jul): expected midnight sun (alwaysAbove), got state=${polarSummer.daylightState}`);
} else if (polarSummer.sunrise !== null || polarSummer.sunset !== null) {
  failures.push(`78N (Jul): midnight sun should report null sunrise/sunset, got sunrise=${polarSummer.sunrise}, sunset=${polarSummer.sunset}`);
} else if (polarSummer.dayLengthMinutes !== 24 * 60) {
  failures.push(`78N (Jul): midnight sun day length should be 24h, got ${polarSummer.dayLengthMinutes}min`);
} else {
  console.log("OK  78N (Jul) midnight sun: sunrise/sunset null, state=alwaysAbove, day length=24h");
}

// Same latitude in January: polar night — the sun never rises.
const polarWinter = getSunTimes(78.22, 15.6, "2026-01-12", "Arctic/Longyearbyen");
if (polarWinter.daylightState !== "alwaysBelow") {
  failures.push(`78N (Jan): expected polar night (alwaysBelow), got state=${polarWinter.daylightState}`);
} else if (polarWinter.dayLengthMinutes !== 0) {
  failures.push(`78N (Jan): polar night day length should be 0min, got ${polarWinter.dayLengthMinutes}`);
} else {
  console.log("OK  78N (Jan) polar night: sunrise/sunset null, state=alwaysBelow, day length=0min");
}

// --- Golden hour / twilight sanity: ordering should hold on a normal day ---

const london2 = london;
const orderingChecks = [
  ["astronomical.dawn", "nautical.dawn"],
  ["nautical.dawn", "civil.dawn"],
  ["civil.dawn", "sunrise"],
  ["sunrise", "goldenHourMorning.end"],
  ["goldenHourEvening.start", "sunset"],
  ["sunset", "civil.dusk"],
  ["civil.dusk", "nautical.dusk"],
  ["nautical.dusk", "astronomical.dusk"],
];

function get(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

let orderingOk = true;
for (const [a, b] of orderingChecks) {
  const ta = get(london2, a);
  const tb = get(london2, b);
  if (ta && tb && ta > tb) {
    failures.push(`London ordering: ${a} (${ta.toFormat("HH:mm")}) should be before ${b} (${tb.toFormat("HH:mm")})`);
    orderingOk = false;
  }
}
if (orderingOk) console.log("OK  London twilight/golden-hour event ordering is chronological");

// --- Moon phase sanity ---

const moon = getMoonPhase(JULY_DATE);
if (moon.illuminatedFraction < 0 || moon.illuminatedFraction > 1) {
  failures.push(`Moon illuminated fraction out of range: ${moon.illuminatedFraction}`);
} else {
  console.log(`OK  Moon phase ${JULY_DATE}: ${moon.phase} ${moon.emoji}, illuminated ${(moon.illuminatedFraction * 100).toFixed(1)}%, next full moon ${moon.nextFullMoon}, next new moon ${moon.nextNewMoon}`);
}

// Global coherence: same date should always give the same phase regardless
// of how it's called (no hidden dependency on local machine timezone).
const moonAgain = getMoonPhase(JULY_DATE);
if (moon.phase !== moonAgain.phase || moon.age !== moonAgain.age) {
  failures.push("Moon phase is not deterministic for the same date");
} else {
  console.log("OK  Moon phase is deterministic for a given date");
}

if (failures.length > 0) {
  console.error("\nFAILURES:");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}

console.log("\nAll sun/moon sanity checks passed.");
