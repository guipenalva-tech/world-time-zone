#!/usr/bin/env node
/**
 * Sanity check for src/lib/solar.ts, required by the Map View spec: the
 * subsolar declination must track the seasons correctly (in particular,
 * around the June solstice it should sit near +23.44°, the July value
 * used in this sprint should be a northern-hemisphere-summer value near
 * +21-23°N, and the night polygon must close on the pole that's actually
 * dark). Run with: node --experimental-strip-types scripts/check-solar.mjs
 * (the flag is needed since this imports solar.ts directly; Node 22's
 * type-stripping mode runs it with no separate build step).
 */
import { getSolarPosition, buildNightPolygon } from "../src/lib/solar.ts";

const failures = [];

function assertClose(label, actual, expected, tolerance) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    failures.push(`${label}: expected ~${expected}, got ${actual.toFixed(3)} (tolerance ${tolerance})`);
  } else {
    console.log(`OK  ${label}: ${actual.toFixed(3)} (expected ~${expected} +/- ${tolerance})`);
  }
}

// June solstice: declination should sit at Earth's axial tilt, ~23.44N.
assertClose(
  "June solstice declination",
  getSolarPosition(new Date("2026-06-21T12:00:00Z")).declinationDeg,
  23.44,
  0.1,
);

// December solstice: declination should sit at ~23.44S.
assertClose(
  "December solstice declination",
  getSolarPosition(new Date("2026-12-21T12:00:00Z")).declinationDeg,
  -23.44,
  0.1,
);

// March equinox: declination should be ~0.
assertClose(
  "March equinox declination",
  getSolarPosition(new Date("2026-03-20T12:00:00Z")).declinationDeg,
  0,
  0.5,
);

// The sprint's required check: in July, the subsolar point is north of the
// equator (~+21 to +23N), so the night side must cover high SOUTHERN
// latitudes (the polygon closes at the south pole, -90).
const julyDate = new Date("2026-07-12T12:00:00Z");
const julySolar = getSolarPosition(julyDate);
if (julySolar.declinationDeg < 15 || julySolar.declinationDeg > 23.44) {
  failures.push(`July declination out of expected range: ${julySolar.declinationDeg}`);
} else {
  console.log(`OK  July declination is northern-hemisphere-summer: ${julySolar.declinationDeg.toFixed(2)}N`);
}

const julyPolygon = buildNightPolygon(julyDate);
const closingLat = julyPolygon[julyPolygon.length - 1][1];
if (closingLat !== -90) {
  failures.push(`July night polygon should close at the south pole (-90), got ${closingLat}`);
} else {
  console.log(`OK  July night polygon closes at the south pole (-90) — night covers high southern latitudes`);
}

if (failures.length > 0) {
  console.error("\nFAILURES:");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}

console.log("\nAll solar sanity checks passed.");
