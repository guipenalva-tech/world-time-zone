/**
 * Turns the pure facts from `cityFacts.ts` into a short list of narrative
 * sentences for the /time/[city] page's "about this city" paragraph.
 * Deliberately framework-free (no i18n import here): each sentence is a
 * `{ key, values }` pair — `key` names an ICU message template in the
 * `CityPage` messages namespace, `values` are the interpolation params.
 * Actual sentence text/translation happens at render time via
 * `next-intl`'s `t(sentence.key, sentence.values)`.
 *
 * Every branch below reads real per-city data (DST status, latitude,
 * offset shape, country timezone count) — swapping the city changes which
 * branches fire and what numbers they carry, which is the whole point:
 * this is the module responsible for the page's content not being a
 * templated-with-the-name-swapped shell.
 */
import type { CityFacts } from "./cityFacts";

export interface NarrativeSentence {
  key: string;
  values: Record<string, string | number>;
}

/**
 * Builds 3-5 sentences (never a fixed count) for `facts.city`:
 * 1. Offset/DST sentence vs. the primary reference city — three mutually
 *    exclusive branches: DST-abolished-in-2019 (Brazil), DST-observing
 *    (gap shifts twice a year), or DST-never-observed (gap is constant).
 * 2. Sun/latitude sentence — only fires for midnight sun, polar night, or
 *    a genuinely extreme latitude; ordinary mid-latitude cities skip it
 *    rather than restate the numeric sunrise/sunset block below in prose.
 * 3. Fractional UTC offset sentence — only for :30/:45 zones.
 * 4. Country timezone-shape sentence — China's single-nationwide-zone
 *    special case, multi-zone countries, island nations, or the
 *    single-zone default, in that priority order (mutually exclusive).
 */
export function buildCityNarrative(facts: CityFacts): NarrativeSentence[] {
  const { city } = facts;
  const sentences: NarrativeSentence[] = [];

  // 1. Offset / DST sentence.
  const primaryDiff = facts.referenceCities.find(
    (r) => r.city.id === facts.primaryReference?.id,
  );
  if (primaryDiff && facts.primaryReference) {
    const base = {
      city: city.name,
      refCity: facts.primaryReference.name,
      hours: primaryDiff.diffHoursAbs,
      minutes: primaryDiff.diffMinutesAbs,
      direction: primaryDiff.direction,
    };

    if (primaryDiff.direction !== "same") {
      if (city.countryCode === "BR") {
        sentences.push({
          key: "narrativeDstAbolished",
          values: { city: city.name, offset: facts.zoneInfo.offsetFormatted },
        });
      } else if (facts.dstTransition) {
        sentences.push({ key: "narrativeOffsetVaries", values: base });
      } else {
        sentences.push({
          key: "narrativeOffsetConstant",
          values: {
            ...base,
            contrastCity: (facts.dstContrastCity ?? facts.primaryReference).name,
          },
        });
      }
    }
  }

  // 2. Sun / latitude sentence.
  const hemisphereWordKey = facts.hemisphere === "N" ? "hemisphereNorthWord" : "hemisphereSouthWord";
  if (facts.sun.daylightState === "alwaysAbove") {
    sentences.push({
      key: "narrativeMidnightSun",
      values: { city: city.name, lat: facts.latAbs, hemisphereKey: hemisphereWordKey },
    });
  } else if (facts.sun.daylightState === "alwaysBelow") {
    sentences.push({
      key: "narrativePolarNight",
      values: { city: city.name, lat: facts.latAbs, hemisphereKey: hemisphereWordKey },
    });
  } else if (facts.isExtremeLatitude) {
    const totalMinutes = Math.round(facts.sun.dayLengthMinutes);
    sentences.push({
      key: "narrativeDaylightExtreme",
      values: {
        city: city.name,
        lat: facts.latAbs,
        hemisphereKey: hemisphereWordKey,
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
      },
    });
  }

  // 3. Fractional UTC offset sentence.
  if (facts.isFractionalOffset) {
    sentences.push({
      key: "narrativeHalfHourOffset",
      values: {
        city: city.name,
        offset: facts.zoneInfo.offsetFormatted,
        minutesPart: facts.offsetFractionMinutes,
      },
    });
  }

  // 4. Country timezone-shape sentence (mutually exclusive, priority order).
  if (facts.isChinaSpecialCase) {
    sentences.push({
      key: "narrativeChinaSpecial",
      values: { city: city.name, offset: facts.zoneInfo.offsetFormatted },
    });
  } else if (facts.countryTimezoneCount > 1) {
    sentences.push({
      key: "narrativeMultiZoneCountry",
      values: { city: city.name, country: city.country, count: facts.countryTimezoneCount },
    });
  } else if (facts.isIslandNation) {
    sentences.push({
      key: "narrativeIslandNation",
      values: { city: city.name, country: city.country },
    });
  } else {
    sentences.push({
      key: "narrativeSingleZoneCountry",
      values: { city: city.name, country: city.country },
    });
  }

  return sentences;
}
