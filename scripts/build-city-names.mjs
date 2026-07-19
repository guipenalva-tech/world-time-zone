#!/usr/bin/env node
/**
 * Generator for src/data/cityNames.json -- locale-specific display names
 * for every city.json entry that Wikidata covers with high confidence.
 * NOT run at runtime (same pattern as scripts/build-world-map.mjs): the
 * output is committed and the app never calls Wikidata itself.
 *
 * Why Wikidata instead of a hand-typed table: a manually-typed table for
 * 477 cities x 10 locales risks silently inventing a translation that
 * doesn't actually exist (exactly the mistake this feature must avoid).
 * Wikidata (CC0, no attribution required) has real per-language labels
 * for the vast majority of cities in this dataset, maintained by human
 * editors in each language's own Wikipedia community.
 *
 * Pipeline:
 *   1. Fetch every country item's ISO 3166-1 alpha-2 code (P297) once via
 *      SPARQL -- ~260 rows, used to check a candidate's country (P17)
 *      against city.countryCode. This is the strongest disambiguator:
 *      city *names* repeat constantly ("San Jose", "Springfield",
 *      "Alexandria", ...), so name-only matching is not safe.
 *   2. For each of the 477 cities, search Wikidata (wbsearchentities, en)
 *      for candidate items sharing its name.
 *   3. Batch-fetch each candidate's P17 (country) + P625 (coordinates)
 *      via wbgetentities, keep candidates whose country matches
 *      city.countryCode, and pick the one whose coordinates are closest
 *      to (and within MAX_DISTANCE_KM of) the city's lat/lon. No country
 *      match or no candidate within range => the city is left unmatched
 *      (reported, not guessed) and falls back to the English name at
 *      lookup time (see src/lib/i18nNames.ts).
 *   4. For every matched city, batch-fetch labels in the app's 10
 *      non-English locales and keep only the ones that actually differ
 *      from the English `city.name` -- everything else already falls
 *      back to it, so there's no point storing a duplicate.
 *   5. Cross-checks the result against a small hand-verified reference
 *      table (this script's REFERENCE_CHECK) and prints any divergence,
 *      as a sanity check on both sides.
 *
 * Run with: node scripts/build-city-names.mjs
 */
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CITIES_PATH = path.join(__dirname, "../src/data/cities.json");
const OUT_PATH = path.join(__dirname, "../src/data/cityNames.json");

const USER_AGENT =
  "WorldTimeZoneBuildScript/1.0 (build-time city-name lookup; not a runtime dependency)";
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

const MAX_DISTANCE_KM = 60;
const SEARCH_LIMIT = 10;
const CONCURRENCY = 6;

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

async function fetchJson(url, attempt = 1) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) {
    if (res.status === 429 && attempt <= 3) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

/** Runs `fn` over `items` with at most `n` in flight at once. */
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

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchCountryIsoMap() {
  const query = "SELECT ?country ?iso WHERE { ?country wdt:P297 ?iso . }";
  const json = await fetchJson(`${SPARQL}?query=${encodeURIComponent(query)}&format=json`);
  const map = new Map(); // QID -> ISO2
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
  const out = new Map(); // QID -> { countryQid, lat, lon }
  for (const group of chunk(ids, 50)) {
    if (group.length === 0) continue;
    const url = `${API}?action=wbgetentities&ids=${group.join("|")}&props=claims&format=json`;
    const json = await fetchJson(url);
    for (const [id, entity] of Object.entries(json.entities ?? {})) {
      const countryQid = entity.claims?.P17?.[0]?.mainsnak?.datavalue?.value?.id;
      const coord = entity.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      out.set(id, {
        countryQid,
        lat: coord?.latitude,
        lon: coord?.longitude,
      });
    }
  }
  return out;
}

async function fetchLabels(ids) {
  const out = new Map(); // QID -> { lang: label }
  const langs = Object.values(LOCALE_TO_WIKIDATA_LANG).join("|");
  for (const group of chunk(ids, 50)) {
    if (group.length === 0) continue;
    const url = `${API}?action=wbgetentities&ids=${group.join("|")}&props=labels&languages=${langs}&format=json`;
    const json = await fetchJson(url);
    for (const [id, entity] of Object.entries(json.entities ?? {})) {
      const labels = {};
      for (const [lang, entry] of Object.entries(entity.labels ?? {})) {
        labels[lang] = entry.value;
      }
      out.set(id, labels);
    }
  }
  return out;
}

/** Small hand-verified set (well-known reference/hub cities) used purely
 * to sanity-check the Wikidata-sourced output -- NOT written to the
 * output file. Divergences are printed for manual review. */
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

async function main() {
  const cities = JSON.parse(readFileSync(CITIES_PATH, "utf8"));
  console.log(`Loaded ${cities.length} cities.`);

  console.log("Fetching country QID -> ISO2 map...");
  const countryIsoByQid = await fetchCountryIsoMap();
  console.log(`  ${countryIsoByQid.size} countries.`);

  console.log(`Searching Wikidata for ${cities.length} city names (concurrency ${CONCURRENCY})...`);
  const searchResults = await mapPool(cities, CONCURRENCY, async (city) => {
    try {
      return await searchCandidates(city.name);
    } catch (err) {
      console.error(`  search failed for ${city.id}: ${err.message}`);
      return [];
    }
  });

  const allCandidateIds = [...new Set(searchResults.flat())];
  console.log(`Fetching claims for ${allCandidateIds.length} candidate entities...`);
  const claimsById = await fetchClaims(allCandidateIds);

  const matchedQidByCity = new Map();
  const unmatched = [];
  cities.forEach((city, i) => {
    const candidates = searchResults[i];
    let best = null;
    let bestDist = Infinity;
    for (const qid of candidates) {
      const claim = claimsById.get(qid);
      if (!claim || claim.lat === undefined) continue;
      const iso = claim.countryQid ? countryIsoByQid.get(claim.countryQid) : undefined;
      if (iso !== city.countryCode) continue;
      const dist = haversineKm(city.lat, city.lon, claim.lat, claim.lon);
      if (dist < bestDist) {
        bestDist = dist;
        best = qid;
      }
    }
    if (best && bestDist <= MAX_DISTANCE_KM) {
      matchedQidByCity.set(city.id, best);
    } else {
      unmatched.push(city.id);
    }
  });
  console.log(`Matched ${matchedQidByCity.size}/${cities.length} cities (within ${MAX_DISTANCE_KM}km, country-verified).`);
  if (unmatched.length > 0) {
    console.log(`Unmatched (${unmatched.length}), will fall back to English name:`);
    console.log(`  ${unmatched.join(", ")}`);
  }

  console.log(`Fetching labels for ${matchedQidByCity.size} matched entities...`);
  const labelsByQid = await fetchLabels([...matchedQidByCity.values()]);

  const cityNames = {};
  let totalLabelEntries = 0;
  for (const city of cities) {
    const qid = matchedQidByCity.get(city.id);
    if (!qid) continue;
    const labels = labelsByQid.get(qid) ?? {};
    const entry = {};
    for (const [locale, wikidataLang] of Object.entries(LOCALE_TO_WIKIDATA_LANG)) {
      const label = labels[wikidataLang];
      if (label && label.trim() && label.trim() !== city.name) {
        entry[locale] = label.trim();
      }
    }
    if (Object.keys(entry).length > 0) {
      cityNames[city.id] = entry;
      totalLabelEntries += Object.keys(entry).length;
    }
  }

  console.log(`\nCities with at least one localized name: ${Object.keys(cityNames).length}`);
  console.log(`Total (city, locale) name entries: ${totalLabelEntries}`);

  console.log("\n--- Cross-check against hand-verified reference set ---");
  for (const [cityId, expected] of Object.entries(REFERENCE_CHECK)) {
    const got = cityNames[cityId] ?? {};
    for (const [locale, expectedName] of Object.entries(expected)) {
      const gotName = got[locale];
      if (gotName !== expectedName) {
        console.log(`  DIVERGENCE ${cityId} [${locale}]: expected "${expectedName}", Wikidata gave ${gotName ? `"${gotName}"` : "(missing/same-as-English)"}`);
      }
    }
  }

  writeFileSync(OUT_PATH, JSON.stringify(cityNames, null, 2) + "\n");
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
