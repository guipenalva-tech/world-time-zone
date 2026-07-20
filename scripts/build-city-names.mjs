#!/usr/bin/env node
/**
 * Incremental generator + verifier for src/data/cityNames.json -- locale-
 * specific display names for city.json entries, sourced from Wikidata
 * where it has a confident match. NOT run at runtime (same pattern as
 * scripts/build-world-map.mjs): the output is committed and the app
 * never calls Wikidata itself.
 *
 * Why Wikidata instead of a hand-typed table: a manually-typed table for
 * 477 cities x 10 locales risks silently inventing a translation that
 * doesn't actually exist (exactly the mistake this feature must avoid).
 * Wikidata (CC0, no attribution required) has real per-language labels
 * for the vast majority of cities in this dataset, maintained by human
 * editors in each language's own Wikipedia community.
 *
 * -- Two query strategies --
 *
 * 1) SPARQL geo-box batch match (primary, fast): the Wikidata Query
 *    Service exposes a `wikibase:box` geospatial index service that is
 *    genuinely indexed (unlike a bare `FILTER(STR(?label) = ?name)`
 *    scan across the whole label graph, which was tried first and timed
 *    out / 500'd even for 3 names -- there is no index for arbitrary
 *    literal-value search on rdfs:label, only for entities-in-a-region).
 *    For each city this runs one UNION block: find every item within a
 *    ~60km box of the city's (lat, lon) whose *English* label is an
 *    exact match for `city.name`, plus its P17 country and this run's
 *    target-language labels, all in the same block. Many cities' blocks
 *    are combined with UNION into a single POST request (SPARQL endpoint
 *    has no meaningful per-request rate limit like the anonymous action
 *    API does, but a single query can still time out past ~30 cities'
 *    worth of blocks, so batches are kept smaller and split-and-retried
 *    on failure). This is what let the entire 477-city set be attempted
 *    in one sitting, instead of the ~40-city, multi-session, multi-day
 *    plan the old wbsearchentities-only approach required under
 *    anonymous rate limits (see git history for that account: 429s with
 *    escalating Retry-After that a slower retry didn't shorten).
 *
 * 2) Legacy wbsearchentities + wbgetentities per-city fallback (slow,
 *    only for stragglers): a small number of cities have an English
 *    Wikidata label that doesn't literally equal `city.name` (accents,
 *    "City" suffixes, alternate romanization, etc.), so the exact-match
 *    SPARQL query above finds nothing for them. For just that residual
 *    set, fall back to the original fuzzy `wbsearchentities` search +
 *    P17/P625-verified candidate picking, one city at a time, paced at
 *    1.5s/request with 429 backoff -- safe because the residual set is
 *    now small (dozens, not hundreds).
 *
 * Both paths apply the *same* confidence bar: a candidate is only
 * accepted if its P17 country matches city.countryCode AND its P625
 * coordinates are within MAX_DISTANCE_KM of the city's own (lat, lon).
 * City *names* repeat constantly ("San Jose", "Springfield",
 * "Alexandria", ...) so name-only matching is never safe on its own.
 * No match => left unmatched (reported, not guessed); the app falls
 * back to the English name at lookup time (see src/lib/i18nNames.ts).
 *
 * A label is only stored if it differs from the English `city.name` --
 * identical values already fall back correctly, so storing them would
 * just bloat the file.
 *
 * -- Modes --
 *   node scripts/build-city-names.mjs            expand coverage to new
 *                                                 cities, most populous
 *                                                 first, merged into the
 *                                                 existing file.
 *   node scripts/build-city-names.mjs --verify    re-fetch fresh Wikidata
 *                                                 data for cities ALREADY
 *                                                 in the file and report
 *                                                 divergences instead of
 *                                                 overwriting anything.
 *   --limit=N   cap on new cities attempted this run (expand mode only).
 */
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CITIES_PATH = path.join(__dirname, "../src/data/cities.json");
const OUT_PATH = path.join(__dirname, "../src/data/cityNames.json");

const USER_AGENT =
  "WorldTimeZoneBuildScript/1.0 (contact: ai4guip@gmail.com; build-time city-name lookup; not a runtime dependency)";
const API = "https://www.wikidata.org/w/api.php";
const SPARQL = "https://query.wikidata.org/sparql";

/** Wikidata label-language codes for the app's 10 non-English locales.
 * zh-CN/zh-TW map to Wikidata's own "zh-cn"/"zh-tw" monolingual codes,
 * which are already split by script/region the same way the app is. */
const LOCALE_TO_WIKIDATA_LANG = {
  pt: "pt",
  es: "es",
  fr: "fr",
  de: "de",
  hi: "hi",
  it: "it",
  ru: "ru",
  "zh-CN": "zh-cn",
  "zh-TW": "zh-tw",
  ja: "ja",
};
const LATIN_SCRIPT_LOCALES = new Set(["pt", "es", "fr", "de", "it"]);

const MAX_DISTANCE_KM = 60;
const SEARCH_LIMIT = 10;
// Strictly 1 for the legacy REST fallback: `throttle()` serializes on a
// single shared timestamp with no locking, so anything >1 here would let
// several workers race past it at once -- exactly what caused the first
// run's 429s.
const CONCURRENCY = 1;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Picks the best candidate Wikidata entity for `city` out of everything
 * that already passed the country + coordinate-distance gate.
 *
 * City *names* collide constantly -- not just with other cities
 * ("Springfield"), but within a single metro area: a stock exchange
 * building, a postal micro-district, an administrative province, and a
 * statistical "microregion" can all share the exact same English label
 * as the city itself, sit inside the same 60km box, and belong to the
 * same country. A bare nearest-distance pick among them is wrong more
 * often than it looks -- three different real failures turned up during
 * development, each defeating a different naive tiebreaker:
 *
 *  - "New York" nearest-matched the New York Stock Exchange (Wall
 *    Street sits fractionally closer to our stored city-center point
 *    than the city's own Wikidata coordinate does). Fix: prefer
 *    candidates that have a population figure (P1082) at all --
 *    landmarks/organizations essentially never do.
 *  - "Sao Paulo" then nearest-*population*-matched the "Sao Paulo
 *    Microregion" statistical entity over the actual city, because the
 *    metro-area aggregate's population figure is larger than the city
 *    proper's. Fix: population must not just exist, it has to be
 *    plausible for THIS city -- compare it against cities.json's own
 *    population estimate, not against other candidates.
 *  - "Lima" then nearest-*distance*-among-population-havers matched
 *    "Lima District" (a small central comuna, ~315k people) over the
 *    real metro city (~9.9M) and over "Lima Province" (~10.1M) --
 *    because the tiny district's point happens to sit closest of the
 *    three. Fix: a population wildly smaller than expected (here, ~3% of
 *    the ~10.7M cities.json expects) is itself disqualifying, checked
 *    BEFORE falling back to distance.
 *
 * So, in order: (1) require the country+distance gate (done by caller),
 * (2) prefer candidates whose population is within a plausible order of
 * magnitude of cities.json's own estimate (catches over-broad admin
 * aggregates AND under-broad sub-districts at once), (3) break remaining
 * ties by nearest distance -- never by raw population size, which is
 * what caused the Sao Paulo regression. */
function pickBestCandidate(city, candidates) {
  if (candidates.length <= 1) return candidates[0];

  const expectedPop = Number.isFinite(city.population) && city.population > 0 ? city.population : undefined;
  const plausiblyPopulated = (c) =>
    Number.isFinite(c.population) &&
    (expectedPop === undefined || (c.population >= expectedPop * 0.15 && c.population <= expectedPop * 6));

  const tiers = [
    candidates.filter(plausiblyPopulated),
    candidates.filter((c) => Number.isFinite(c.population)),
    candidates,
  ];
  const pool = tiers.find((t) => t.length > 0) ?? candidates;
  return pool.reduce((a, b) => (b.dist < a.dist ? b : a));
}

// ---------------------------------------------------------------------
// Legacy per-city REST path (wbsearchentities + wbgetentities), used
// only as a fallback for cities the SPARQL exact-label match misses.
// ---------------------------------------------------------------------

const MIN_INTERVAL_MS = 1500;
let lastCallAt = 0;
async function throttle() {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

async function fetchJson(url, attempt = 1) {
  await throttle();
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) {
    if (res.status === 429 && attempt <= 6) {
      const retryAfterHeader = Number(res.headers.get("retry-after"));
      const backoffMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : 2000 * attempt;
      console.log(`  429, waiting ${backoffMs}ms (attempt ${attempt})...`);
      await sleep(backoffMs);
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

async function mapPool(items, n, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

async function fetchCountryIsoMap() {
  const query = "SELECT ?country ?iso WHERE { ?country wdt:P297 ?iso . }";
  const json = await sparqlQuery(query);
  const map = new Map();
  for (const row of json.results.bindings) {
    const qid = row.country.value.split("/").pop();
    map.set(qid, row.iso.value);
  }
  return map;
}

async function searchCandidates(name) {
  const url = `${API}?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=${SEARCH_LIMIT}&format=json`;
  const json = await fetchJson(url);
  return (json.search ?? []).map((s) => s.id);
}

async function fetchClaims(ids) {
  const out = new Map();
  const groups = chunk(ids, 50);
  for (const group of groups) {
    if (group.length === 0) continue;
    const url = `${API}?action=wbgetentities&ids=${group.join("|")}&props=claims&format=json`;
    try {
      const json = await fetchJson(url);
      for (const [id, entity] of Object.entries(json.entities ?? {})) {
        const countryQid = entity.claims?.P17?.[0]?.mainsnak?.datavalue?.value?.id;
        const coord = entity.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
        const popClaim = entity.claims?.P1082?.[0]?.mainsnak?.datavalue?.value?.amount;
        const population = popClaim !== undefined ? Number(popClaim) : undefined;
        out.set(id, { countryQid, lat: coord?.latitude, lon: coord?.longitude, population });
      }
    } catch (err) {
      console.error(`  claims chunk failed (${group.length} ids): ${err.message}`);
    }
  }
  return out;
}

async function fetchLabels(ids) {
  const out = new Map();
  const langs = Object.values(LOCALE_TO_WIKIDATA_LANG).join("|");
  const groups = chunk(ids, 50);
  for (const group of groups) {
    if (group.length === 0) continue;
    const url = `${API}?action=wbgetentities&ids=${group.join("|")}&props=labels&languages=${langs}&format=json`;
    try {
      const json = await fetchJson(url);
      for (const [id, entity] of Object.entries(json.entities ?? {})) {
        const labels = {};
        for (const [lang, entry] of Object.entries(entity.labels ?? {})) labels[lang] = entry.value;
        out.set(id, labels);
      }
    } catch (err) {
      console.error(`  labels chunk failed (${group.length} ids): ${err.message}`);
    }
  }
  return out;
}

/** Legacy per-city match for a small residual set. Returns a Map
 * cityId -> { qid, labels: { locale: label } }. */
async function legacyMatchCities(cities, countryIsoByQid) {
  if (cities.length === 0) return new Map();
  console.log(`  Legacy fallback search for ${cities.length} cities (paced ~1.5s/request)...`);
  const searchResults = await mapPool(cities, CONCURRENCY, async (city) => {
    try {
      return await searchCandidates(city.name);
    } catch (err) {
      console.error(`    search failed for ${city.id}: ${err.message}`);
      return [];
    }
  });
  const allCandidateIds = [...new Set(searchResults.flat())];
  const claimsById = await fetchClaims(allCandidateIds);

  const matchedQidByCity = new Map();
  cities.forEach((city, i) => {
    // Same disambiguation as the SPARQL path -- see pickBestCandidate's
    // doc comment for the three real failures (stock exchange, micro-
    // region, sub-district) that shaped this logic.
    const candidates = [];
    for (const qid of searchResults[i]) {
      const claim = claimsById.get(qid);
      if (!claim || claim.lat === undefined) continue;
      const iso = claim.countryQid ? countryIsoByQid.get(claim.countryQid) : undefined;
      if (iso !== city.countryCode) continue;
      const dist = haversineKm(city.lat, city.lon, claim.lat, claim.lon);
      if (dist <= MAX_DISTANCE_KM) candidates.push({ qid, dist, population: claim.population });
    }
    if (candidates.length === 0) return;
    const best = pickBestCandidate(city, candidates);
    matchedQidByCity.set(city.id, best.qid);
  });

  const labelsByQid = await fetchLabels([...matchedQidByCity.values()]);
  const results = new Map();
  for (const city of cities) {
    const qid = matchedQidByCity.get(city.id);
    if (!qid) continue;
    const labels = {};
    for (const [locale, lang] of Object.entries(LOCALE_TO_WIKIDATA_LANG)) {
      const val = labelsByQid.get(qid)?.[lang];
      if (val) labels[locale] = val;
    }
    results.set(city.id, { qid, labels });
  }
  console.log(`  Legacy fallback matched ${results.size}/${cities.length}.`);
  return results;
}

// ---------------------------------------------------------------------
// SPARQL geo-box batch path (primary).
// ---------------------------------------------------------------------

const SPARQL_MIN_INTERVAL_MS = 1500;
let lastSparqlAt = 0;
async function sparqlThrottle() {
  const wait = lastSparqlAt + SPARQL_MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastSparqlAt = Date.now();
}

async function sparqlQuery(query, attempt = 1) {
  await sparqlThrottle();
  const res = await fetch(SPARQL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `query=${encodeURIComponent(query)}`,
  });
  lastSparqlAt = Date.now();
  if (!res.ok) {
    if ((res.status === 429 || res.status === 502 || res.status === 503 || res.status === 500) && attempt <= 4) {
      const retryAfterHeader = Number(res.headers.get("retry-after"));
      const backoffMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : 3000 * attempt;
      console.log(`  SPARQL ${res.status}, waiting ${backoffMs}ms (attempt ${attempt})...`);
      await sleep(backoffMs);
      return sparqlQuery(query, attempt + 1);
    }
    throw new Error(`SPARQL ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`SPARQL returned non-JSON / truncated body (${text.length} bytes)`);
  }
}

function geoBox(lat, lon, kmHalf) {
  const dLat = kmHalf / 111;
  const dLon = kmHalf / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    west: `Point(${(lon - dLon).toFixed(4)} ${(lat - dLat).toFixed(4)})`,
    east: `Point(${(lon + dLon).toFixed(4)} ${(lat + dLat).toFixed(4)})`,
  };
}

function escapeSparqlString(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function langVar(lang) {
  return lang.replace(/[^a-zA-Z0-9]/g, "");
}

function buildBatchQuery(cities) {
  const blocks = cities.map((city, i) => {
    const b = geoBox(city.lat, city.lon, MAX_DISTANCE_KM);
    const optionals = Object.values(LOCALE_TO_WIKIDATA_LANG)
      .map((lang) => {
        const v = langVar(lang);
        return `      OPTIONAL { ?place${i} rdfs:label ?l${i}_${v} . FILTER(LANG(?l${i}_${v})="${lang}") }`;
      })
      .join("\n");
    const selects = Object.values(LOCALE_TO_WIKIDATA_LANG)
      .map((lang) => `(SAMPLE(?l${i}_${langVar(lang)}) AS ?name${i}_${langVar(lang)})`)
      .join(" ");
    return `  {
    SELECT ?place${i} ?iso${i} ?lat${i} ?lon${i} (MAX(?pop${i}raw) AS ?pop${i}) ${selects} WHERE {
      SERVICE wikibase:box {
        ?place${i} wdt:P625 ?loc${i} .
        bd:serviceParam wikibase:cornerWest "${b.west}"^^geo:wktLiteral .
        bd:serviceParam wikibase:cornerEast "${b.east}"^^geo:wktLiteral .
      }
      ?place${i} rdfs:label ?en${i} .
      FILTER(LANG(?en${i})="en" && STR(?en${i})="${escapeSparqlString(city.name)}")
      ?place${i} wdt:P17 ?country${i} .
      ?country${i} wdt:P297 ?iso${i} .
      ?place${i} p:P625/psv:P625 ?coordNode${i} .
      ?coordNode${i} wikibase:geoLatitude ?lat${i} .
      ?coordNode${i} wikibase:geoLongitude ?lon${i} .
      OPTIONAL { ?place${i} wdt:P1082 ?pop${i}raw }
${optionals}
    }
    GROUP BY ?place${i} ?iso${i} ?lat${i} ?lon${i}
  }`;
  });
  return `PREFIX geo: <http://www.opengis.net/ont/geosparql#>\nSELECT * WHERE {\n${blocks.join("\n  UNION\n")}\n}`;
}

/** Runs one SPARQL batch (no retries/splitting -- see runBatchResilient
 * for that) and returns a Map cityId -> { qid, dist, labels }. */
async function runBatch(cities) {
  const query = buildBatchQuery(cities);
  const json = await sparqlQuery(query);
  const rows = json.results.bindings;
  const perCityCandidates = cities.map(() => []);
  for (const row of rows) {
    for (let i = 0; i < cities.length; i++) {
      const placeKey = `place${i}`;
      if (!(placeKey in row)) continue;
      const qid = row[placeKey].value.split("/").pop();
      const iso = row[`iso${i}`]?.value;
      const lat = Number(row[`lat${i}`]?.value);
      const lon = Number(row[`lon${i}`]?.value);
      const popRaw = row[`pop${i}`]?.value;
      const population = popRaw !== undefined ? Number(popRaw) : undefined;
      const labels = {};
      for (const [locale, lang] of Object.entries(LOCALE_TO_WIKIDATA_LANG)) {
        const val = row[`name${i}_${langVar(lang)}`]?.value;
        if (val) labels[locale] = val;
      }
      perCityCandidates[i].push({ qid, iso, lat, lon, population, labels });
    }
  }
  const results = new Map();
  cities.forEach((city, i) => {
    const candidates = perCityCandidates[i]
      .filter((c) => c.iso === city.countryCode && Number.isFinite(c.lat) && Number.isFinite(c.lon))
      .map((c) => ({ ...c, dist: haversineKm(city.lat, city.lon, c.lat, c.lon) }))
      .filter((c) => c.dist <= MAX_DISTANCE_KM);

    if (candidates.length === 0) return;
    const best = pickBestCandidate(city, candidates);
    results.set(city.id, { qid: best.qid, dist: best.dist, labels: best.labels });
  });
  return results;
}

/** Splits a batch in half and retries on failure (502/timeout on a large
 * UNION), down to single cities, instead of giving up on the whole
 * batch. A single city that still fails is simply left for the legacy
 * fallback path. */
async function runBatchResilient(cities, depth = 0) {
  if (cities.length === 0) return new Map();
  try {
    return await runBatch(cities);
  } catch (err) {
    if (cities.length === 1) {
      console.error(`    SPARQL failed for ${cities[0].id}: ${err.message} (will try legacy fallback)`);
      return new Map();
    }
    console.log(`    batch of ${cities.length} failed (${err.message}), splitting in half...`);
    const mid = Math.ceil(cities.length / 2);
    const a = await runBatchResilient(cities.slice(0, mid), depth + 1);
    const b = await runBatchResilient(cities.slice(mid), depth + 1);
    return new Map([...a, ...b]);
  }
}

async function sparqlMatchCities(cities, batchSize = 15) {
  const matches = new Map();
  const batches = chunk(cities, batchSize);
  for (const [idx, b] of batches.entries()) {
    console.log(`  SPARQL batch ${idx + 1}/${batches.length} (${b.length} cities)...`);
    const res = await runBatchResilient(b);
    for (const [id, v] of res) matches.set(id, v);
    console.log(`    matched ${res.size}/${b.length}`);
  }
  return matches;
}

// ---------------------------------------------------------------------
// Suspicious-label heuristic: flags (does not silently drop) a Latin-
// script label that shares almost no characters with the English name.
// This is what caught a real Wikidata data-quality bug during
// development: Q121157 (en label "Mashhad", Iran) has its ptwiki
// sitelink/pt label wrongly pointing at "Mexede" (an unrelated Portuguese
// parish) -- a genuine interlanguage-link mixup on Wikidata's side, not
// a translation. Non-Latin scripts (ru/ja/zh/hi) aren't checked this way
// since transliteration divergence from the English spelling is normal
// and expected there.
// ---------------------------------------------------------------------
function normalizeForCompare(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function bigramSimilarity(a, b) {
  const bigrams = (s) => {
    const out = new Set();
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
    return out;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return a === b ? 1 : 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return (2 * shared) / (A.size + B.size);
}

/** Returns true if `label` looks suspiciously unrelated to `englishName`
 * for a Latin-script locale (i.e. worth a human double-check). */
function isSuspiciousLatinLabel(englishName, label) {
  const a = normalizeForCompare(englishName);
  const b = normalizeForCompare(label);
  if (a.length < 3 || b.length < 3) return false;
  return bigramSimilarity(a, b) < 0.15;
}

function collectSuspicious(cityId, englishName, labels) {
  const flags = [];
  for (const [locale, label] of Object.entries(labels)) {
    if (LATIN_SCRIPT_LOCALES.has(locale) && isSuspiciousLatinLabel(englishName, label)) {
      flags.push({ cityId, locale, englishName, label });
    }
  }
  return flags;
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

const REFERENCE_CHECK = {
  london: { pt: "Londres", "zh-CN": "伦敦", "zh-TW": "倫敦", ja: "ロンドン", ru: "Лондон", hi: "लंदन" },
  tokyo: { pt: "Tóquio", "zh-CN": "东京", "zh-TW": "東京", ja: "東京", ru: "Токио", hi: "टोक्यो" },
  "new-york": { pt: "Nova York", "zh-CN": "纽约", "zh-TW": "紐約", ja: "ニューヨーク", ru: "Нью-Йорк", hi: "न्यूयॉर्क" },
  sydney: { "zh-CN": "悉尼", "zh-TW": "雪梨", ja: "シドニー", ru: "Сидней" },
  singapore: { pt: "Singapura", es: "Singapur", "zh-CN": "新加坡", ja: "シンガポール" },
  beijing: { pt: "Pequim", es: "Pekín", fr: "Pékin", "zh-CN": "北京", "zh-TW": "北京", ja: "北京" },
  moscow: { pt: "Moscou", es: "Moscú", de: "Moskau", it: "Mosca", ja: "モスクワ" },
  cairo: { es: "El Cairo", fr: "Le Caire", de: "Kairo", it: "Il Cairo", ru: "Каир" },
  "mexico-city": { es: "Ciudad de México", fr: "Mexico", de: "Mexiko-Stadt" },
};

const argv = process.argv.slice(2);
const VERIFY_MODE = argv.includes("--verify");
const limitArg = argv.find((a) => a.startsWith("--limit="));
const CITY_LIMIT = limitArg ? Number(limitArg.slice("--limit=".length)) : Infinity;
const batchSizeArg = argv.find((a) => a.startsWith("--batch-size="));
const BATCH_SIZE = batchSizeArg ? Number(batchSizeArg.slice("--batch-size=".length)) : 15;
const onlyArg = argv.find((a) => a.startsWith("--only="));
/** Dev/ops escape hatch: restrict either mode to a specific id list (comma
 * separated), so a spot-check on a handful of high-priority cities doesn't
 * have to pay for a full 102- or 375-city run. Not part of the normal
 * resumable workflow -- just for manual verification runs. */
const ONLY_IDS = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

async function verifyMain(allCities, existingCityNames) {
  const coveredCities = (ONLY_IDS
    ? allCities.filter((c) => ONLY_IDS.has(c.id))
    : allCities.filter((c) => existingCityNames[c.id]));
  console.log(`Verifying ${coveredCities.length} existing entries against fresh Wikidata data...\n`);

  const matches = await sparqlMatchCities(coveredCities, BATCH_SIZE);
  const stillUnmatched = coveredCities.filter((c) => !matches.has(c.id));
  if (stillUnmatched.length > 0) {
    console.log(`\n${stillUnmatched.length} not matched by exact-label SPARQL, trying legacy fallback...`);
    const countryIsoByQid = await fetchCountryIsoMap();
    const legacy = await legacyMatchCities(stillUnmatched, countryIsoByQid);
    for (const [id, v] of legacy) matches.set(id, v);
  }

  const divergences = [];
  const suspicious = [];
  let noMatchCount = 0;
  for (const city of coveredCities) {
    const existing = existingCityNames[city.id];
    const fresh = matches.get(city.id);
    if (!fresh) {
      noMatchCount++;
      divergences.push({ city: city.id, locale: "*", existing: JSON.stringify(existing), fresh: "(no confident Wikidata match found on re-check)" });
      continue;
    }
    suspicious.push(...collectSuspicious(city.id, city.name, fresh.labels));
    for (const locale of Object.keys(LOCALE_TO_WIKIDATA_LANG)) {
      const existingVal = existing[locale];
      const rawFresh = fresh.labels[locale];
      const freshVal = rawFresh && rawFresh !== city.name ? rawFresh : undefined;
      if (existingVal !== freshVal) {
        divergences.push({
          city: city.id,
          locale,
          existing: existingVal ?? "(absent -> English fallback)",
          fresh: freshVal ?? "(absent/same-as-English -> English fallback)",
        });
      }
    }
  }

  console.log(`\n=== DIVERGENCES (${divergences.length} across ${coveredCities.length} cities, ${noMatchCount} cities had no re-verifiable match) ===`);
  for (const d of divergences) {
    console.log(`  ${d.city} [${d.locale}]: existing="${d.existing}"  wikidata="${d.fresh}"`);
  }

  console.log(`\n=== SUSPICIOUS LABELS (${suspicious.length}) -- low character overlap with English name, needs a human look ===`);
  for (const s of suspicious) {
    console.log(`  ${s.cityId} [${s.locale}]: "${s.englishName}" -> "${s.label}"`);
  }

  const perLocaleFieldCount = coveredCities.reduce((n, c) => n + Object.keys(existingCityNames[c.id]).length, 0);
  const perLocaleDivergentFields = divergences.filter((d) => d.locale !== "*").length;
  console.log(`\n=== SUMMARY ===`);
  console.log(`Cities checked: ${coveredCities.length}`);
  console.log(`Cities with no re-verifiable Wikidata match: ${noMatchCount}`);
  console.log(`Existing (city, locale) name fields: ${perLocaleFieldCount}`);
  console.log(`Fields diverging from a fresh Wikidata fetch: ${perLocaleDivergentFields} (${((perLocaleDivergentFields / perLocaleFieldCount) * 100).toFixed(1)}%)`);
  console.log(`Suspicious (low-similarity Latin-script) labels: ${suspicious.length}`);
}

async function expandMain(allCities, existingCityNames) {
  const alreadyCovered = new Set(Object.keys(existingCityNames));
  const remaining = allCities
    .filter((c) => !alreadyCovered.has(c.id))
    .sort((a, b) => b.population - a.population);
  console.log(`${alreadyCovered.size} cities already covered.`);
  console.log(`${remaining.length} cities remain uncovered.`);

  const cities = remaining.slice(0, CITY_LIMIT);
  if (cities.length === 0) {
    console.log("Nothing to do -- every city is already covered.");
    return;
  }
  console.log(`This run: attempting ${cities.length} of them, most populous first.\n`);

  console.log("SPARQL geo-box batch matching...");
  const matches = await sparqlMatchCities(cities, BATCH_SIZE);
  console.log(`\nSPARQL matched ${matches.size}/${cities.length}.`);

  const stillUnmatched = cities.filter((c) => !matches.has(c.id));
  if (stillUnmatched.length > 0) {
    console.log(`\n${stillUnmatched.length} unmatched by exact-label SPARQL, trying legacy fuzzy fallback...`);
    const countryIsoByQid = await fetchCountryIsoMap();
    const legacy = await legacyMatchCities(stillUnmatched, countryIsoByQid);
    for (const [id, v] of legacy) matches.set(id, v);
  }

  const rejectedDuplicateMatch = [];
  const newCityNames = {};
  const suspicious = [];
  let totalLabelEntries = 0;
  for (const city of cities) {
    const match = matches.get(city.id);
    if (!match) continue;
    suspicious.push(...collectSuspicious(city.id, city.name, match.labels));
    const entry = {};
    for (const [locale, label] of Object.entries(match.labels)) {
      if (label && label.trim() && label.trim() !== city.name) entry[locale] = label.trim();
    }
    if (Object.keys(entry).length > 0) {
      newCityNames[city.id] = entry;
      totalLabelEntries += Object.keys(entry).length;
    }
  }

  const unmatchedFinal = cities.filter((c) => !matches.has(c.id));
  console.log(`\nNewly-covered cities this run: ${Object.keys(newCityNames).length} (of ${cities.length} attempted)`);
  console.log(`New (city, locale) name entries: ${totalLabelEntries}`);
  console.log(`Rejected as no confident match (fell back to English): ${unmatchedFinal.length}`);
  if (unmatchedFinal.length > 0) {
    console.log(`  ${unmatchedFinal.map((c) => c.id).join(", ")}`);
  }

  console.log(`\n=== SUSPICIOUS LABELS (${suspicious.length}) -- low character overlap with English name, needs a human look ===`);
  for (const s of suspicious) {
    console.log(`  ${s.cityId} [${s.locale}]: "${s.englishName}" -> "${s.label}"`);
  }

  // Sanity check: no two cities in this run should have been assigned
  // the exact same Wikidata QID (that would mean one got the other's
  // identity/name).
  const qidToCity = new Map();
  for (const city of cities) {
    const match = matches.get(city.id);
    if (!match) continue;
    if (qidToCity.has(match.qid)) {
      rejectedDuplicateMatch.push({ a: qidToCity.get(match.qid), b: city.id, qid: match.qid });
    } else {
      qidToCity.set(match.qid, city.id);
    }
  }
  if (rejectedDuplicateMatch.length > 0) {
    console.log(`\n!!! WARNING: ${rejectedDuplicateMatch.length} cities matched the SAME Wikidata QID:`);
    for (const r of rejectedDuplicateMatch) console.log(`  ${r.a} and ${r.b} both -> ${r.qid}`);
  }

  console.log("\n--- Cross-check against hand-verified reference set ---");
  const merged = { ...existingCityNames, ...newCityNames };
  for (const [cityId, expected] of Object.entries(REFERENCE_CHECK)) {
    const got = merged[cityId] ?? {};
    for (const [locale, expectedName] of Object.entries(expected)) {
      const gotName = got[locale];
      if (gotName !== expectedName) {
        console.log(`  DIVERGENCE ${cityId} [${locale}]: expected "${expectedName}", got ${gotName ? `"${gotName}"` : "(missing/same-as-English)"}`);
      }
    }
  }

  const stillRemaining = allCities.length - Object.keys(merged).length;
  console.log(`\nTotal covered after this run: ${Object.keys(merged).length}/${allCities.length} (${stillRemaining} still fall back to English).`);

  writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2) + "\n");
  console.log(`Wrote ${OUT_PATH}`);
}

async function main() {
  const allCities = JSON.parse(readFileSync(CITIES_PATH, "utf8"));
  console.log(`Loaded ${allCities.length} cities.`);

  let existingCityNames = {};
  try {
    existingCityNames = JSON.parse(readFileSync(OUT_PATH, "utf8"));
  } catch {
    // No existing file yet -- starting from scratch is fine.
  }

  if (VERIFY_MODE) {
    await verifyMain(allCities, existingCityNames);
  } else {
    await expandMain(allCities, existingCityNames);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
