/**
 * Pure, deterministic flight duration/price ESTIMATION for the /flights
 * view. There is no paid flights API wired up yet (Amadeus/Kiwi/Skyscanner
 * etc. are out of scope for now), so every number produced here is a
 * formula-based approximation meant for rough trip planning — never treat
 * these as real fares, schedules, or availability. The UI that consumes
 * this module must keep that disclaimer highly visible.
 *
 * All money values are plain USD numbers (no currency conversion — that's
 * the separate /currency feature's job).
 */

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;

/** Great-circle (haversine) distance between two lat/lon points, in km. */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return EARTH_RADIUS_KM * c;
}

// ---------------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------------

/** Assumed average cruise speed for a commercial jet, in km/h. */
const CRUISE_SPEED_KMH = 850;
/** Fixed overhead for taxi, takeoff climb, and landing/descent, in minutes. */
const GROUND_OVERHEAD_MINUTES = 45;
/** Realistic floor: even a very short hop involves a full takeoff/landing
 * cycle, so the pure distance/speed formula alone underestimates it. */
const MIN_FLIGHT_MINUTES = 60;
/** Typical layover dwell time added per connection, in minutes. */
const LAYOVER_MINUTES_PER_STOP = 90;
/** Connecting itineraries rarely fly the direct great-circle route (extra
 * routing via a hub), so each stop also inflates airborne time a bit. */
const ROUTING_OVERHEAD_PER_STOP = 0.12;

/**
 * Estimated direct-flight duration (in minutes) for a given great-circle
 * distance: distance / cruise speed, plus fixed ground overhead, floored at
 * a realistic minimum for very short hops.
 */
export function estimateFlightDuration(distanceKm: number): number {
  const flightMinutes = (Math.max(distanceKm, 0) / CRUISE_SPEED_KMH) * 60;
  const total = flightMinutes + GROUND_OVERHEAD_MINUTES;
  return Math.max(MIN_FLIGHT_MINUTES, Math.round(total));
}

/**
 * Estimated total duration (in minutes) for an itinerary with `connections`
 * stops: the direct-flight estimate, inflated for indirect routing, plus
 * layover dwell time (with a small deterministic jitter per stop so
 * multi-stop options don't all show identical padding).
 */
export function estimateItineraryDuration(
  distanceKm: number,
  connections: number,
  seed: number,
): number {
  const base = estimateFlightDuration(distanceKm);
  if (connections <= 0) return base;
  const routingFactor = 1 + connections * ROUTING_OVERHEAD_PER_STOP;
  const layoverJitter = Math.round(seededFraction(seed) * 40); // 0-40min per stop
  const layover = connections * LAYOVER_MINUTES_PER_STOP + layoverJitter * connections;
  return Math.round(base * routingFactor + layover);
}

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

/** Date options for the /flights date picker, from "leaving now" to
 * "booked well in advance". */
export const DATE_OPTIONS = [
  "today",
  "tomorrow",
  "in48h",
  "in1Week",
  "in2Weeks",
  "in3Weeks",
  "in1Month",
] as const;

export type DateOption = (typeof DATE_OPTIONS)[number];

/**
 * Price multiplier by booking lead time. Modeled loosely on real airline
 * revenue-management behavior: fares spike for near-term travel (last
 * -minute demand, few discount seats left), settle to a baseline around
 * 1-2 weeks out, and dip slightly further for trips booked 3-4 weeks
 * ahead (past the typical "advance purchase" discount threshold, before
 * far-future uncertainty would start pushing them back up again).
 */
const DATE_MULTIPLIERS: Record<DateOption, number> = {
  today: 2.0,
  tomorrow: 1.8,
  in48h: 1.6,
  in1Week: 1.2,
  in2Weeks: 1.0,
  in3Weeks: 0.95,
  in1Month: 0.85,
};

/**
 * Base-price curve calibrated so short hops aren't absurdly cheap per-km
 * and long hauls aren't absurdly expensive: basePrice = A + B*sqrt(km).
 * Cost-per-km falls off with distance (fixed costs like crew, airport fees,
 * and turnaround dominate short flights; long-haul spreads them thin), which
 * a sqrt curve captures reasonably. The intercept A is negative because
 * fitting the curve to plausible anchor points (~$80-150 @ 300km, ~$600-1200
 * @ 6000km, ~$1200-2500 @ 15000km) pulls it below zero — MIN_BASE_PRICE_USD
 * clamps the output so nearby/short routes never go unrealistically low.
 */
const BASE_PRICE_INTERCEPT = -110;
const BASE_PRICE_PER_SQRT_KM = 13;
const MIN_BASE_PRICE_USD = 35;

/** Direct flights command a convenience premium; connecting itineraries are
 * discounted (each extra stop chips off a bit more, floored so it never
 * goes unrealistically cheap). */
const DIRECT_PRICE_MULTIPLIER = 1.15;
const CONNECTING_PRICE_MULTIPLIER = 0.9;
const PRICE_DISCOUNT_PER_STOP = 0.06;
const MIN_CONNECTING_MULTIPLIER = 0.65;

/** Half-width of the displayed min-max band, as a fraction of the point
 * estimate — reinforces that this is a range, not a quote. */
const PRICE_BAND_FRACTION = 0.14;

export interface PriceRangeUsd {
  minUsd: number;
  maxUsd: number;
}

/**
 * Estimated one-way price range (USD) for a direct itinerary at the given
 * distance and booking lead time. `isDirect` applies the direct-flight
 * premium; pass `false` for connecting itineraries (see
 * {@link estimateFlightOptions} for further per-stop discounting).
 */
export function estimateFlightPrice(
  distanceKm: number,
  dateOption: DateOption,
  isDirect: boolean,
): PriceRangeUsd {
  const base =
    BASE_PRICE_INTERCEPT + BASE_PRICE_PER_SQRT_KM * Math.sqrt(Math.max(distanceKm, 1));
  const floored = Math.max(MIN_BASE_PRICE_USD, base);
  const dateAdjusted = floored * DATE_MULTIPLIERS[dateOption];
  const routeAdjusted =
    dateAdjusted * (isDirect ? DIRECT_PRICE_MULTIPLIER : CONNECTING_PRICE_MULTIPLIER);
  const spread = routeAdjusted * PRICE_BAND_FRACTION;
  return {
    minUsd: roundTo5(routeAdjusted - spread),
    maxUsd: roundTo5(routeAdjusted + spread),
  };
}

function roundTo5(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5);
}

// ---------------------------------------------------------------------------
// Deterministic "randomness" (seeded by distance + option, not Math.random)
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random fraction in [0, 1) from a numeric seed, so
 * the same route always renders the same simulated per-carrier fares (no
 * flicker on re-render, no server/client mismatch). */
function seededFraction(seed: number): number {
  const x = Math.sin(seed) * 43758.5453123;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Combined options ("cheapest" / "fastest" / "balanced")
// ---------------------------------------------------------------------------

export type FlightOptionKind = "cheapest" | "fastest" | "balanced";

export interface FlightOptionEstimate {
  kind: FlightOptionKind;
  priceMinUsd: number;
  priceMaxUsd: number;
  durationMinutes: number;
  /** Number of connections; 0 = direct. */
  connections: number;
}

/**
 * Generates 2-3 simulated itinerary options for a route/date: the fastest
 * (direct, priced at a premium), the cheapest (most connections, most
 * discounted), and — for routes long enough that a 1-stop itinerary makes
 * sense — a balanced option in between. Each option gets a small
 * deterministic price jitter (seeded by distance + option — deliberately
 * *not* by date) to simulate different carriers quoting slightly different
 * fares for the same route. Keeping date out of the jitter seed matters:
 * it's what guarantees switching the date chip only ever moves prices via
 * DATE_MULTIPLIERS (so "today" is reliably pricier than "1 month" for every
 * option) and never perturbs duration, which shouldn't change with the
 * booking date at all.
 */
export function estimateFlightOptions(
  distanceKm: number,
  dateOption: DateOption,
): FlightOptionEstimate[] {
  const routeSeed = Math.round(distanceKm);

  const cheapestConnections = distanceKm > 6000 ? 2 : distanceKm > 500 ? 1 : 0;
  const balancedConnections = distanceKm > 500 ? 1 : 0;

  const specs: {
    kind: FlightOptionKind;
    connections: number;
    isDirect: boolean;
    seedOffset: number;
  }[] = [
    { kind: "fastest", connections: 0, isDirect: true, seedOffset: 11 },
    { kind: "balanced", connections: balancedConnections, isDirect: false, seedOffset: 23 },
    { kind: "cheapest", connections: cheapestConnections, isDirect: false, seedOffset: 37 },
  ];

  // Short routes: a direct flight is also the cheapest/only sensible
  // option, so "balanced" (same connections as "fastest") is redundant —
  // drop it and show just cheapest + fastest.
  const filtered =
    balancedConnections === 0 && cheapestConnections === 0
      ? specs.filter((s) => s.kind !== "balanced")
      : specs;

  return filtered.map(({ kind, connections, isDirect, seedOffset }) => {
    const seed = routeSeed + seedOffset;
    const jitter = 0.92 + seededFraction(seed) * 0.16; // +/-8% "carrier" variance

    const priceMultiplierForStops =
      connections > 0
        ? Math.max(
            MIN_CONNECTING_MULTIPLIER,
            1 - connections * PRICE_DISCOUNT_PER_STOP,
          )
        : 1;

    const price = estimateFlightPrice(distanceKm, dateOption, isDirect);
    const duration = estimateItineraryDuration(distanceKm, connections, seed);

    return {
      kind,
      priceMinUsd: roundTo5(price.minUsd * jitter * priceMultiplierForStops),
      priceMaxUsd: roundTo5(price.maxUsd * jitter * priceMultiplierForStops),
      durationMinutes: duration,
      connections,
    };
  });
}
