import { DateTime } from "luxon";
import type { City } from "@/types/city";
import { cities, normalize } from "@/lib/cities";
import { toLuxonLocale } from "@/lib/timezone";
import type { HourFormat } from "@/stores/settingsStore";

/**
 * Rule-based (no AI, no network) parser + calculator for natural-language
 * time zone questions, e.g. "what time is it in Tokyo?" or "time difference
 * between London and New York". Everything here is pure/synchronous so it
 * can run on every keystroke or submit with no latency.
 *
 * `answerTimeQuestion` returns `null` when the question isn't understood —
 * callers should treat that as "show example prompts", not as an error. The
 * shape is intentionally decoupled from any specific UI/i18n string so a
 * future AI-backed fallback could be plugged in behind the same `null`
 * return without touching call sites.
 */

export interface ZoneTime {
  hour: number;
  minute: number;
  /** Locale-aware formatted local time, e.g. "3:00 PM". */
  formatted: string;
}

export type TimeQuestionAnswer =
  | { intent: "current"; city: City; time: ZoneTime }
  | {
      intent: "convert";
      sourceCity: City;
      targetCity: City;
      sourceTime: ZoneTime;
      targetTime: ZoneTime;
      /** Calendar-day offset of the target's date relative to the source's (-1, 0, +1, ...). */
      dayOffset: number;
    }
  | {
      intent: "difference";
      cityA: City;
      cityB: City;
      /** Signed hour difference: positive means cityA's clock is ahead of cityB's. */
      diffHours: number;
    };

/** Formats a signed hour difference for display, e.g. 5 -> "5", 5.5 -> "5.5". */
export function formatHourDiff(hours: number): string {
  const abs = Math.abs(hours);
  return Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
}

// ---------------------------------------------------------------------------
// City matching
// ---------------------------------------------------------------------------

interface CityCandidate {
  normalized: string;
  city: City;
}

interface CityMatch {
  city: City;
  index: number;
}

let candidatesCache: CityCandidate[] | null = null;

function getCandidates(): CityCandidate[] {
  if (candidatesCache) return candidatesCache;
  const list: CityCandidate[] = [];
  for (const city of cities) {
    list.push({ normalized: normalize(city.name), city });
    for (const alias of city.aliases ?? []) {
      list.push({ normalized: normalize(alias), city });
    }
  }
  // Longest candidates first so multi-word names/aliases win over shorter
  // substrings (e.g. "new york" before any single-word alias).
  list.sort((a, b) => b.normalized.length - a.normalized.length);
  candidatesCache = list;
  return list;
}

function isWordChar(ch: string | undefined): boolean {
  return !!ch && /[a-z0-9]/i.test(ch);
}

/** Finds distinct cities mentioned in `normalizedText`, ordered by first appearance. */
function findCitiesInText(normalizedText: string): CityMatch[] {
  const candidates = getCandidates();
  const claimed: Array<[number, number]> = [];
  const matches: CityMatch[] = [];
  const seenCityIds = new Set<string>();

  function overlapsClaimed(start: number, end: number): boolean {
    return claimed.some(([s, e]) => start < e && end > s);
  }

  for (const { normalized, city } of candidates) {
    if (!normalized || seenCityIds.has(city.id)) continue;

    let fromIndex = 0;
    while (fromIndex <= normalizedText.length) {
      const idx = normalizedText.indexOf(normalized, fromIndex);
      if (idx === -1) break;
      const end = idx + normalized.length;
      const boundaryOk =
        !isWordChar(normalizedText[idx - 1]) && !isWordChar(normalizedText[end]);

      if (boundaryOk && !overlapsClaimed(idx, end)) {
        claimed.push([idx, end]);
        matches.push({ city, index: idx });
        seenCityIds.add(city.id);
        break;
      }
      fromIndex = idx + 1;
    }
  }

  matches.sort((a, b) => a.index - b.index);
  return matches;
}

// ---------------------------------------------------------------------------
// Time-of-day extraction
// ---------------------------------------------------------------------------

interface TimeMatch {
  hour: number;
  minute: number;
  index: number;
}

/** Words that mark an hour as PM when no am/pm token is otherwise present. */
const MERIDIEM_PM_WORDS: Record<string, string[]> = {
  en: ["in the evening", "at night", "tonight"],
  pt: ["da tarde", "da noite"],
  es: ["de la tarde", "de la noche"],
  fr: ["du soir", "de l'apres-midi", "de l apres-midi"],
  de: ["abends", "nachmittags"],
  hi: ["shaam", "raat", "शाम", "रात"],
};

const MERIDIEM_AM_WORDS: Record<string, string[]> = {
  en: ["in the morning"],
  pt: ["da manha"],
  es: ["de la manana"],
  fr: ["du matin"],
  de: ["morgens", "vormittags"],
  hi: ["subah", "सुबह"],
};

/** Bare-word "hour" units that confirm a nearby number is a time, not a count. */
const TIME_UNIT_WORDS = ["horas", "hora", "heures", "heure", "uhr", "baje", "बजे"];

/** Cue words that precede a bare hour without any unit (e.g. Spanish "las 15"). */
const LEADING_CUE_WORDS: Record<string, string[]> = {
  es: ["las", "la"],
};

function applyMeridiem(
  hour: number,
  isPm: boolean,
  isAm: boolean,
): number {
  let h = hour;
  if (isPm && h < 12) h += 12;
  if (isAm && h === 12) h = 0;
  return h;
}

function extractTime(text: string, locale: string): TimeMatch | null {
  // 1) HH:MM with optional am/pm — "15:30", "3:30 pm".
  let m = /\b([01]?\d|2[0-3]):([0-5]\d)\s*(am|pm)?\b/.exec(text);
  if (m) {
    const hour = applyMeridiem(parseInt(m[1], 10), m[3] === "pm", m[3] === "am");
    return { hour, minute: parseInt(m[2], 10), index: m.index };
  }

  // 2) "HHhMM" / "HHh" — pt/fr style, e.g. "15h", "15h30".
  m = /\b([01]?\d|2[0-3])h([0-5]\d)?\b/.exec(text);
  if (m) {
    return {
      hour: parseInt(m[1], 10),
      minute: m[2] ? parseInt(m[2], 10) : 0,
      index: m.index,
    };
  }

  // 3) 12h clock with am/pm — "3pm", "3:30 pm", "03 am".
  m = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/.exec(text);
  if (m) {
    const hour = applyMeridiem(parseInt(m[1], 10), m[3] === "pm", m[3] === "am");
    return { hour, minute: m[2] ? parseInt(m[2], 10) : 0, index: m.index };
  }

  // 4) Bare hour + a nearby meridiem phrase ("3 de la tarde", "3 da noite").
  const pmWords = MERIDIEM_PM_WORDS[locale] ?? [];
  const amWords = MERIDIEM_AM_WORDS[locale] ?? [];
  const bareRe = /\b([01]?\d|2[0-3])\b/g;
  let bm: RegExpExecArray | null;
  while ((bm = bareRe.exec(text))) {
    const windowEnd = Math.min(text.length, bm.index + bm[0].length + 20);
    const window = text.slice(bm.index, windowEnd);
    const isPm = pmWords.some((w) => window.includes(w));
    const isAm = amWords.some((w) => window.includes(w));
    if (isPm || isAm) {
      return {
        hour: applyMeridiem(parseInt(bm[1], 10), isPm, isAm),
        minute: 0,
        index: bm.index,
      };
    }
  }

  // 5) Bare hour + a locale time-unit word nearby ("15 horas", "3 baje").
  const unitRe = /\b([01]?\d|2[0-3])\b/g;
  let um: RegExpExecArray | null;
  while ((um = unitRe.exec(text))) {
    const windowEnd = Math.min(text.length, um.index + um[0].length + 15);
    const window = text.slice(um.index, windowEnd);
    if (TIME_UNIT_WORDS.some((w) => window.includes(w))) {
      return { hour: parseInt(um[1], 10), minute: 0, index: um.index };
    }
  }

  // 6) Locale-specific leading cue word + bare hour ("las 15").
  for (const cue of LEADING_CUE_WORDS[locale] ?? []) {
    const re = new RegExp(`\\b${cue}\\s+([01]?\\d|2[0-3])\\b`);
    const cm = re.exec(text);
    if (cm) {
      return { hour: parseInt(cm[1], 10), minute: 0, index: cm.index };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Intent classification + answer building
// ---------------------------------------------------------------------------

interface LocaleKeywords {
  /** Phrases indicating "how far apart are these clocks" intent. */
  difference: string[];
}

const KEYWORDS: Record<string, LocaleKeywords> = {
  en: {
    difference: [
      "difference between",
      "time difference",
      "how many hours",
      "hours ahead",
      "hours behind",
    ],
  },
  pt: {
    difference: [
      "diferenca entre",
      "diferenca de horario",
      "quantas horas de diferenca",
    ],
  },
  es: {
    difference: [
      "diferencia entre",
      "diferencia horaria",
      "cuantas horas de diferencia",
    ],
  },
  fr: {
    difference: [
      "difference entre",
      "decalage horaire",
      "combien d'heures",
      "combien d heures",
    ],
  },
  de: {
    difference: ["unterschied zwischen", "zeitunterschied", "wie viele stunden"],
  },
  hi: {
    difference: ["mein antar", "में अंतर", "समय का अंतर", "kitne ghante ka antar"],
  },
};

function containsAny(text: string, phrases: string[]): boolean {
  return phrases.some((p) => text.includes(p));
}

function toZoneTime(dt: DateTime, hourFormat: HourFormat): ZoneTime {
  return {
    hour: dt.hour,
    minute: dt.minute,
    formatted: dt.toFormat(hourFormat === "24" ? "HH:mm" : "h:mm a"),
  };
}

/** Picks which of two mentioned cities the extracted hour belongs to: whichever is textually closest to it. */
function pickSourceAndTarget(
  matches: [CityMatch, CityMatch],
  timeIndex: number,
): [CityMatch, CityMatch] {
  const [a, b] = matches;
  const distA = Math.abs(a.index - timeIndex);
  const distB = Math.abs(b.index - timeIndex);
  return distA <= distB ? [a, b] : [b, a];
}

function buildCurrent(
  city: City,
  locale: string,
  hourFormat: HourFormat,
): TimeQuestionAnswer {
  const now = DateTime.now().setZone(city.timezone).setLocale(toLuxonLocale(locale));
  return { intent: "current", city, time: toZoneTime(now, hourFormat) };
}

function buildConversion(
  sourceCity: City,
  targetCity: City,
  hour: number,
  minute: number,
  locale: string,
  hourFormat: HourFormat,
): TimeQuestionAnswer {
  const luxonLocale = toLuxonLocale(locale);
  const sourceDt = DateTime.now()
    .setZone(sourceCity.timezone)
    .set({ hour, minute, second: 0, millisecond: 0 })
    .setLocale(luxonLocale);
  const targetDt = sourceDt.setZone(targetCity.timezone).setLocale(luxonLocale);

  const dayOffset = Math.round(
    targetDt.startOf("day").diff(sourceDt.startOf("day"), "days").days,
  );

  return {
    intent: "convert",
    sourceCity,
    targetCity,
    sourceTime: toZoneTime(sourceDt, hourFormat),
    targetTime: toZoneTime(targetDt, hourFormat),
    dayOffset,
  };
}

function buildDifference(cityA: City, cityB: City): TimeQuestionAnswer {
  const now = DateTime.now();
  const offsetA = now.setZone(cityA.timezone).offset;
  const offsetB = now.setZone(cityB.timezone).offset;
  return { intent: "difference", cityA, cityB, diffHours: (offsetA - offsetB) / 60 };
}

/**
 * Parses and answers a natural-language time zone question. Returns `null`
 * when the question can't be confidently understood.
 */
export function answerTimeQuestion(
  question: string,
  locale: string,
  hourFormat: HourFormat = "12",
): TimeQuestionAnswer | null {
  const normalized = normalize(question);
  if (!normalized.trim()) return null;

  const matches = findCitiesInText(normalized);
  if (matches.length === 0) return null;

  const keywords = KEYWORDS[locale] ?? KEYWORDS.en;
  const hasDifferenceWords = containsAny(normalized, keywords.difference);
  const timeMatch = extractTime(normalized, locale);

  if (hasDifferenceWords && matches.length >= 2) {
    return buildDifference(matches[0].city, matches[1].city);
  }

  if (timeMatch && matches.length >= 2) {
    const [source, target] = pickSourceAndTarget(
      [matches[0], matches[1]],
      timeMatch.index,
    );
    return buildConversion(
      source.city,
      target.city,
      timeMatch.hour,
      timeMatch.minute,
      locale,
      hourFormat,
    );
  }

  if (matches.length >= 1 && !timeMatch) {
    return buildCurrent(matches[0].city, locale, hourFormat);
  }

  return null;
}

/** All distinct cities referenced by an answer, for "add to comparator" actions. */
export function answerCities(answer: TimeQuestionAnswer): City[] {
  switch (answer.intent) {
    case "current":
      return [answer.city];
    case "convert":
      return [answer.sourceCity, answer.targetCity];
    case "difference":
      return [answer.cityA, answer.cityB];
  }
}
