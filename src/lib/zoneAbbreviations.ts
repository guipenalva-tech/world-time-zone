/**
 * Curated timezone-abbreviation dataset.
 *
 * Luxon's `DateTime.offsetNameShort` is backed by the runtime's CLDR data,
 * which in this environment only supplies real 3-4 letter codes for US
 * zones (e.g. "EDT", "PST") — everywhere else it falls back to a generic
 * "GMT+9" / "UTC+5:30" style string. That makes it impossible to search
 * for "JST", "BST", "IST", etc., and pointless to display them (they'd
 * just repeat the offset). This file is a hand-curated map from the
 * abbreviation a person would actually type or say out loud to the IANA
 * zone ids it designates, used to patch both search and display for the
 * zones CLDR won't name.
 *
 * SCOPE: every zone id below was checked against the 247 distinct
 * `timezone` values that actually appear in `src/data/cities.json` (see
 * the verification script referenced in the PR/task) — nothing here
 * references a zone id absent from that set. Coverage favors codes
 * people commonly search for; obscure or unstable-DST zones (e.g. most
 * of the former Soviet Central Asian zones, Fiji, Samoa, Malaysia) are
 * deliberately omitted because their tzdata abbreviation, if any, could
 * not be confirmed with confidence — see "Deliberately omitted" at the
 * bottom of this file.
 *
 * AMBIGUITY: several 3-4 letter codes are shared by unrelated zones
 * (e.g. "CST" = China / US Central / Cuba). Every sense is listed in a
 * single entry's `zones` array so a search for the code surfaces all of
 * them — see the per-entry comments below for which senses are combined
 * and why. One consequence: `isDst` is a single flag per *code*, not per
 * zone, so for a code whose senses disagree on DST-ness (e.g. "BST" is
 * simultaneously the DST variant for London and the permanent standard
 * time for Bangladesh) the display resolver (see `getZoneInfo` in
 * `timezone.ts`) can only pick the code for the sense matching that
 * flag; the other sense still matches for *search* (it's in `zones`)
 * but falls back to the plain offset for *display*, exactly like a zone
 * with no curated entry at all — never an incorrect label, just a less
 * informative one.
 */

/** One curated timezone-abbreviation entry. */
export interface ZoneAbbreviation {
  /** IANA zone ids this code designates. Every id here exists in cities.json. */
  zones: string[];
  /** True when the code denotes the summer/daylight variant (e.g. BST, CEST, EDT). */
  isDst: boolean;
  /** Full English name, e.g. "Japan Standard Time". */
  label: string;
}

/** Map from UPPERCASE abbreviation code to what it designates. */
export const ZONE_ABBREVIATIONS: Record<string, ZoneAbbreviation> = {
  // --- Universal ---
  GMT: {
    zones: [
      "Africa/Abidjan",
      "Africa/Accra",
      "Africa/Bamako",
      "Africa/Conakry",
      "Africa/Dakar",
      "Africa/Freetown",
      "Africa/Monrovia",
      "Africa/Nouakchott",
      "Africa/Ouagadougou",
      "Africa/Sao_Tome",
      "Atlantic/Reykjavik",
      "Europe/London",
    ],
    isDst: false,
    label: "Greenwich Mean Time",
  },
  // Not a real tzdata abbreviation for any of these zones (they're all
  // formatted "GMT"), but people search "UTC" just as often as "GMT" for
  // the same zero-offset zones, so we mirror the GMT entry for findability.
  UTC: {
    zones: [
      "Africa/Abidjan",
      "Africa/Accra",
      "Africa/Bamako",
      "Africa/Conakry",
      "Africa/Dakar",
      "Africa/Freetown",
      "Africa/Monrovia",
      "Africa/Nouakchott",
      "Africa/Ouagadougou",
      "Africa/Sao_Tome",
      "Atlantic/Reykjavik",
      "Europe/London",
    ],
    isDst: false,
    label: "Coordinated Universal Time",
  },

  // --- Western/Central/Eastern Europe ---
  WET: {
    zones: ["Europe/Lisbon", "Atlantic/Faroe"],
    isDst: false,
    label: "Western European Time",
  },
  WEST: {
    zones: ["Europe/Lisbon", "Atlantic/Faroe"],
    isDst: true,
    label: "Western European Summer Time",
  },
  // Ambiguous: British Summer Time (Europe/London, DST) and Bangladesh
  // Standard Time (Asia/Dhaka, permanent — Bangladesh has no DST). The
  // `isDst: true` flag matches London's sense only; Dhaka still matches
  // search but display falls back to the plain offset (see file header).
  BST: {
    zones: ["Europe/London", "Asia/Dhaka"],
    isDst: true,
    label: "British Summer Time",
  },
  CET: {
    zones: [
      "Europe/Amsterdam",
      "Europe/Andorra",
      "Europe/Belgrade",
      "Europe/Berlin",
      "Europe/Bratislava",
      "Europe/Brussels",
      "Europe/Budapest",
      "Europe/Copenhagen",
      "Europe/Gibraltar",
      "Europe/Ljubljana",
      "Europe/Luxembourg",
      "Europe/Madrid",
      "Europe/Malta",
      "Europe/Oslo",
      "Europe/Paris",
      "Europe/Podgorica",
      "Europe/Prague",
      "Europe/Rome",
      "Europe/Sarajevo",
      "Europe/Skopje",
      "Europe/Stockholm",
      "Europe/Tirane",
      "Europe/Vienna",
      "Europe/Warsaw",
      "Europe/Zagreb",
      "Europe/Zurich",
      // Algeria and Tunisia are UTC+1 year-round with no DST, but tzdata
      // formats both as "CET" (a historical quirk, not geography).
      "Africa/Algiers",
      "Africa/Tunis",
    ],
    isDst: false,
    label: "Central European Time",
  },
  CEST: {
    zones: [
      "Europe/Amsterdam",
      "Europe/Andorra",
      "Europe/Belgrade",
      "Europe/Berlin",
      "Europe/Bratislava",
      "Europe/Brussels",
      "Europe/Budapest",
      "Europe/Copenhagen",
      "Europe/Gibraltar",
      "Europe/Ljubljana",
      "Europe/Luxembourg",
      "Europe/Madrid",
      "Europe/Malta",
      "Europe/Oslo",
      "Europe/Paris",
      "Europe/Podgorica",
      "Europe/Prague",
      "Europe/Rome",
      "Europe/Sarajevo",
      "Europe/Skopje",
      "Europe/Stockholm",
      "Europe/Tirane",
      "Europe/Vienna",
      "Europe/Warsaw",
      "Europe/Zagreb",
      "Europe/Zurich",
    ],
    isDst: true,
    label: "Central European Summer Time",
  },
  EET: {
    zones: [
      "Europe/Athens",
      "Europe/Bucharest",
      "Europe/Chisinau",
      "Europe/Helsinki",
      "Europe/Kyiv",
      "Europe/Riga",
      "Europe/Sofia",
      "Europe/Tallinn",
      "Europe/Vilnius",
      "Asia/Nicosia",
    ],
    isDst: false,
    label: "Eastern European Time",
  },
  EEST: {
    zones: [
      "Europe/Athens",
      "Europe/Bucharest",
      "Europe/Chisinau",
      "Europe/Helsinki",
      "Europe/Kyiv",
      "Europe/Riga",
      "Europe/Sofia",
      "Europe/Tallinn",
      "Europe/Vilnius",
      "Asia/Nicosia",
    ],
    isDst: true,
    label: "Eastern European Summer Time",
  },
  MSK: {
    zones: ["Europe/Moscow"],
    isDst: false,
    label: "Moscow Time",
  },
  TRT: {
    zones: ["Europe/Istanbul"],
    isDst: false,
    label: "Turkey Time",
  },

  // --- Africa ---
  WAT: {
    zones: [
      "Africa/Bangui",
      "Africa/Brazzaville",
      "Africa/Douala",
      "Africa/Kinshasa",
      "Africa/Lagos",
      "Africa/Libreville",
      "Africa/Luanda",
      "Africa/Malabo",
      "Africa/Ndjamena",
      "Africa/Niamey",
    ],
    isDst: false,
    label: "West Africa Time",
  },
  CAT: {
    zones: [
      "Africa/Bujumbura",
      "Africa/Gaborone",
      "Africa/Harare",
      "Africa/Khartoum",
      "Africa/Kigali",
      "Africa/Lubumbashi",
      "Africa/Lusaka",
      "Africa/Maputo",
      "Africa/Windhoek",
    ],
    isDst: false,
    label: "Central Africa Time",
  },
  EAT: {
    zones: [
      "Africa/Addis_Ababa",
      "Africa/Asmara",
      "Africa/Dar_es_Salaam",
      "Africa/Djibouti",
      "Africa/Kampala",
      "Africa/Mogadishu",
      "Africa/Nairobi",
      "Indian/Antananarivo",
    ],
    isDst: false,
    label: "East Africa Time",
  },
  SAST: {
    zones: ["Africa/Johannesburg"],
    isDst: false,
    label: "South Africa Standard Time",
  },

  // --- Middle East / South Asia ---
  GST: {
    zones: ["Asia/Dubai", "Asia/Muscat"],
    isDst: false,
    label: "Gulf Standard Time",
  },
  // Ambiguous: Atlantic Standard Time (Canada Maritimes + non-DST
  // Caribbean) and Arabia Standard Time (Gulf states). Both senses are
  // permanent-standard almost everywhere except America/Halifax, which
  // pairs with the ADT entry below.
  AST: {
    zones: [
      "Asia/Aden",
      "Asia/Baghdad",
      "Asia/Bahrain",
      "Asia/Kuwait",
      "Asia/Qatar",
      "Asia/Riyadh",
      "America/Halifax",
      "America/Puerto_Rico",
      "America/Aruba",
      "America/Barbados",
      "America/Curacao",
      "America/Grenada",
      "America/Port_of_Spain",
      "America/St_Lucia",
      "America/Tortola",
    ],
    isDst: false,
    label: "Atlantic Standard Time",
  },
  ADT: {
    zones: ["America/Halifax"],
    isDst: true,
    label: "Atlantic Daylight Time",
  },
  IRST: {
    zones: ["Asia/Tehran"],
    isDst: false,
    label: "Iran Standard Time",
  },
  AFT: {
    zones: ["Asia/Kabul"],
    isDst: false,
    label: "Afghanistan Time",
  },
  PKT: {
    zones: ["Asia/Karachi"],
    isDst: false,
    label: "Pakistan Standard Time",
  },
  // Ambiguous: India Standard Time (Asia/Kolkata, permanent), Irish
  // Standard Time (Europe/Dublin — Ireland's own permanent-standard
  // period, formatted "GMT" by tzdata; see file header for the DST-flag
  // caveat this creates), and Israel Standard Time (Asia/Jerusalem,
  // pairs with IDT below).
  IST: {
    zones: ["Asia/Kolkata", "Europe/Dublin", "Asia/Jerusalem"],
    isDst: false,
    label: "India Standard Time",
  },
  IDT: {
    zones: ["Asia/Jerusalem"],
    isDst: true,
    label: "Israel Daylight Time",
  },

  // --- East / Southeast Asia ---
  ICT: {
    zones: ["Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Phnom_Penh", "Asia/Vientiane"],
    isDst: false,
    label: "Indochina Time",
  },
  WIB: {
    zones: ["Asia/Jakarta"],
    isDst: false,
    label: "Western Indonesia Time",
  },
  WITA: {
    zones: ["Asia/Makassar"],
    isDst: false,
    label: "Central Indonesia Time",
  },
  WIT: {
    zones: ["Asia/Jayapura"],
    isDst: false,
    label: "Eastern Indonesia Time",
  },
  HKT: {
    zones: ["Asia/Hong_Kong"],
    isDst: false,
    label: "Hong Kong Time",
  },
  SGT: {
    zones: ["Asia/Singapore"],
    isDst: false,
    label: "Singapore Time",
  },
  MMT: {
    zones: ["Asia/Yangon"],
    isDst: false,
    label: "Myanmar Time",
  },
  NPT: {
    zones: ["Asia/Kathmandu"],
    isDst: false,
    label: "Nepal Time",
  },
  // Ambiguous: China Standard Time (Asia/Shanghai, Asia/Taipei,
  // Asia/Macau — none observe DST), (US) Central Standard Time, and
  // Cuba Standard Time (America/Havana, pairs with CDT below). Central
  // American zones (Guatemala, El Salvador, Nicaragua, Honduras, Costa
  // Rica) and Saskatchewan (Regina) are also permanently CST. Mexico
  // City is included here only — Mexico abolished national DST in 2022.
  CST: {
    zones: [
      "Asia/Shanghai",
      "Asia/Taipei",
      "Asia/Macau",
      "America/Chicago",
      "America/Havana",
      "America/Guatemala",
      "America/El_Salvador",
      "America/Managua",
      "America/Tegucigalpa",
      "America/Costa_Rica",
      "America/Regina",
      "America/Mexico_City",
      "America/Winnipeg",
    ],
    isDst: false,
    label: "China Standard Time",
  },
  CDT: {
    zones: ["America/Chicago", "America/Havana", "America/Winnipeg"],
    isDst: true,
    label: "Central Daylight Time",
  },
  JST: {
    zones: ["Asia/Tokyo"],
    isDst: false,
    label: "Japan Standard Time",
  },
  KST: {
    zones: ["Asia/Seoul"],
    isDst: false,
    label: "Korea Standard Time",
  },

  // --- Australia / New Zealand ---
  AEST: {
    zones: ["Australia/Brisbane", "Australia/Sydney", "Australia/Melbourne", "Australia/Hobart"],
    isDst: false,
    label: "Australian Eastern Standard Time",
  },
  // Queensland (Brisbane) doesn't observe DST, so it's absent here.
  AEDT: {
    zones: ["Australia/Sydney", "Australia/Melbourne", "Australia/Hobart"],
    isDst: true,
    label: "Australian Eastern Daylight Time",
  },
  ACST: {
    zones: ["Australia/Adelaide", "Australia/Darwin"],
    isDst: false,
    label: "Australian Central Standard Time",
  },
  // Northern Territory (Darwin) doesn't observe DST, so it's absent here.
  ACDT: {
    zones: ["Australia/Adelaide"],
    isDst: true,
    label: "Australian Central Daylight Time",
  },
  AWST: {
    zones: ["Australia/Perth"],
    isDst: false,
    label: "Australian Western Standard Time",
  },
  NZST: {
    zones: ["Pacific/Auckland"],
    isDst: false,
    label: "New Zealand Standard Time",
  },
  NZDT: {
    zones: ["Pacific/Auckland"],
    isDst: true,
    label: "New Zealand Daylight Time",
  },

  // --- North America ---
  EST: {
    zones: [
      "America/New_York",
      "America/Detroit",
      "America/Indiana/Indianapolis",
      "America/Toronto",
      "America/Nassau",
      "America/Port-au-Prince",
      // Permanent EST, no DST:
      "America/Cancun",
      "America/Jamaica",
      "America/Cayman",
      "America/Panama",
    ],
    isDst: false,
    label: "Eastern Standard Time",
  },
  EDT: {
    zones: [
      "America/New_York",
      "America/Detroit",
      "America/Indiana/Indianapolis",
      "America/Toronto",
      "America/Nassau",
      "America/Port-au-Prince",
    ],
    isDst: true,
    label: "Eastern Daylight Time",
  },
  MST: {
    zones: ["America/Denver", "America/Boise", "America/Edmonton", "America/Phoenix"],
    isDst: false,
    label: "Mountain Standard Time",
  },
  // Arizona (Phoenix) doesn't observe DST, so it's absent here.
  MDT: {
    zones: ["America/Denver", "America/Boise", "America/Edmonton"],
    isDst: true,
    label: "Mountain Daylight Time",
  },
  PST: {
    zones: ["America/Los_Angeles", "America/Vancouver", "America/Tijuana"],
    isDst: false,
    label: "Pacific Standard Time",
  },
  PDT: {
    zones: ["America/Los_Angeles", "America/Vancouver", "America/Tijuana"],
    isDst: true,
    label: "Pacific Daylight Time",
  },
  AKST: {
    zones: ["America/Anchorage", "America/Juneau"],
    isDst: false,
    label: "Alaska Standard Time",
  },
  AKDT: {
    zones: ["America/Anchorage", "America/Juneau"],
    isDst: true,
    label: "Alaska Daylight Time",
  },
  HST: {
    zones: ["Pacific/Honolulu", "America/Adak"],
    isDst: false,
    label: "Hawaii Standard Time",
  },
  // Only the Aleutians (America/Adak) observe DST under this name.
  HDT: {
    zones: ["America/Adak"],
    isDst: true,
    label: "Hawaii-Aleutian Daylight Time",
  },
  NST: {
    zones: ["America/St_Johns"],
    isDst: false,
    label: "Newfoundland Standard Time",
  },
  NDT: {
    zones: ["America/St_Johns"],
    isDst: true,
    label: "Newfoundland Daylight Time",
  },

  // --- South America ---
  BRT: {
    zones: ["America/Sao_Paulo", "America/Bahia", "America/Fortaleza", "America/Recife"],
    isDst: false,
    label: "Brasília Time",
  },
  // Ambiguous: Amazon Time (America/Manaus, Brazil) and Armenia Time
  // (Asia/Yerevan) — unrelated zones that happen to share the initials.
  AMT: {
    zones: ["America/Manaus", "Asia/Yerevan"],
    isDst: false,
    label: "Amazon Time",
  },
  ART: {
    zones: [
      "America/Argentina/Buenos_Aires",
      "America/Argentina/Cordoba",
      "America/Argentina/Mendoza",
    ],
    isDst: false,
    label: "Argentina Time",
  },
  CLT: {
    zones: ["America/Santiago"],
    isDst: false,
    label: "Chile Standard Time",
  },
  CLST: {
    zones: ["America/Santiago"],
    isDst: true,
    label: "Chile Summer Time",
  },
  COT: {
    zones: ["America/Bogota"],
    isDst: false,
    label: "Colombia Time",
  },
  PET: {
    zones: ["America/Lima"],
    isDst: false,
    label: "Peru Time",
  },
  VET: {
    zones: ["America/Caracas"],
    isDst: false,
    label: "Venezuela Time",
  },
  UYT: {
    zones: ["America/Montevideo"],
    isDst: false,
    label: "Uruguay Standard Time",
  },
};

/*
 * Deliberately omitted (checked, but not confident enough in the exact
 * tzdata abbreviation — or the zone's DST rule changes too often — to
 * include without risking a wrong label):
 *  - EGY / Egypt (Africa/Cairo): DST status has flip-flopped several
 *    times since 2014; couldn't confirm the current tzdata format string.
 *  - Malaysia/Brunei (Asia/Kuala_Lumpur, Asia/Kuching, Asia/Brunei),
 *    the Philippines (Asia/Manila), Sri Lanka (Asia/Colombo), Mongolia
 *    (Asia/Ulaanbaatar): tzdata most likely formats these as a bare
 *    numeric offset, not a named code.
 *  - Post-Soviet Central Asia (Asia/Almaty, Asia/Bishkek, Asia/Dushanbe,
 *    Asia/Tashkent, Asia/Samarkand, Asia/Ashgabat), the Caucasus minus
 *    Armenia (Asia/Baku, Asia/Tbilisi), and all Russian regional zones
 *    (Asia/Irkutsk, Asia/Krasnoyarsk, Asia/Novosibirsk, Asia/Sakhalin,
 *    Asia/Vladivostok, Asia/Yekaterinburg, Asia/Kamchatka): tzdata
 *    dropped named abbreviations for these in favor of numeric offsets.
 *  - Belarus (Europe/Minsk), Kaliningrad (Europe/Kaliningrad), Jordan
 *    (Asia/Amman), Lebanon (Asia/Beirut), Syria (Asia/Damascus),
 *    Azerbaijan (Asia/Baku): no confirmed named abbreviation.
 *  - Fiji (Pacific/Fiji): DST dates are set by annual government
 *    decree, not a fixed rule — too unstable to curate confidently.
 *  - Samoa, Vanuatu, Tuvalu, Solomon Islands, Guam, Nauru, Niue, New
 *    Caledonia, Palau, Micronesia, Cook Islands, Northern Marianas,
 *    Tahiti, Kiribati, Tonga, and the half-hour/45-minute Australian
 *    outliers (Australia/Eucla, Australia/Lord_Howe, Pacific/Chatham):
 *    real but obscure codes that couldn't be confirmed with confidence.
 */
