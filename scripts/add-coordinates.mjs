#!/usr/bin/env node
/**
 * Enriches src/data/cities.json with lat/lon fields from coords-data.mjs,
 * then validates the result. Run with: node scripts/add-coordinates.mjs
 *
 * Validations:
 *  - every city has both lat and lon
 *  - lat in [-90, 90], lon in [-180, 180]
 *  - spot-checks a handful of well-known cities against expected values
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { COORDS } from "./coords-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const citiesPath = path.join(__dirname, "..", "src", "data", "cities.json");

const cities = JSON.parse(readFileSync(citiesPath, "utf8"));

const missing = [];
const enriched = cities.map((city) => {
  const coord = COORDS[city.id];
  if (!coord) {
    missing.push(city.id);
    return city;
  }
  const [lat, lon] = coord;
  // Preserve key order: id, name, country, countryCode, timezone, lat, lon,
  // population, aliases — insert lat/lon right after timezone.
  const { id, name, country, countryCode, timezone, population, aliases } = city;
  const next = { id, name, country, countryCode, timezone, lat, lon, population };
  if (aliases) next.aliases = aliases;
  return next;
});

if (missing.length > 0) {
  console.error(`Missing coordinates for ${missing.length} cities:`);
  console.error(missing.join(", "));
  process.exit(1);
}

// Range + completeness validation.
const errors = [];
for (const city of enriched) {
  if (typeof city.lat !== "number" || typeof city.lon !== "number") {
    errors.push(`${city.id}: lat/lon not numbers`);
    continue;
  }
  if (city.lat < -90 || city.lat > 90) {
    errors.push(`${city.id}: lat ${city.lat} out of range`);
  }
  if (city.lon < -180 || city.lon > 180) {
    errors.push(`${city.id}: lon ${city.lon} out of range`);
  }
}

if (enriched.length !== cities.length) {
  errors.push(`City count changed: ${cities.length} -> ${enriched.length}`);
}

// Spot-check known coordinates (within ~0.5 degree tolerance).
const SPOT_CHECKS = [
  { id: "sao-paulo", lat: -23.55, lon: -46.63 },
  { id: "london", lat: 51.51, lon: -0.13 },
  { id: "tokyo", lat: 35.68, lon: 139.69 },
  { id: "sydney", lat: -33.87, lon: 151.21 },
  { id: "honolulu", lat: 21.31, lon: -157.86 },
  { id: "cairo", lat: 30.04, lon: 31.24 },
  { id: "moscow", lat: 55.76, lon: 37.62 },
  { id: "buenos-aires", lat: -34.6, lon: -58.38 },
  { id: "new-york", lat: 40.71, lon: -74.01 },
  { id: "reykjavik", lat: 64.15, lon: -21.94 },
];

const byId = new Map(enriched.map((c) => [c.id, c]));
for (const check of SPOT_CHECKS) {
  const city = byId.get(check.id);
  if (!city) {
    errors.push(`spot-check: ${check.id} not found`);
    continue;
  }
  const dLat = Math.abs(city.lat - check.lat);
  const dLon = Math.abs(city.lon - check.lon);
  if (dLat > 0.5 || dLon > 0.5) {
    errors.push(
      `spot-check failed: ${check.id} expected (${check.lat}, ${check.lon}), got (${city.lat}, ${city.lon})`,
    );
  }
}

if (errors.length > 0) {
  console.error("Validation errors:");
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}

writeFileSync(citiesPath, JSON.stringify(enriched, null, 2) + "\n", "utf8");

console.log(`OK: enriched ${enriched.length} cities with lat/lon.`);
console.log(`Spot-checks passed: ${SPOT_CHECKS.map((c) => c.id).join(", ")}`);
