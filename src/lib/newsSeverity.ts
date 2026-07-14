/**
 * Best-effort severity classifier for a news headline (News view). Google
 * News returns headlines in whatever language the local press wrote them
 * in — not necessarily the app's active locale — so the keyword lists below
 * intentionally span all 6 supported languages rather than just the current
 * one. This is a coarse heuristic (a keyword match, nothing more): it's
 * meant to help a headline stand out, not to be an authoritative safety
 * classification.
 */

export type NewsSeverity = "disaster" | "warning" | "disruption";

const DISASTER_WORDS = [
  "earthquake",
  "tsunami",
  "wildfire",
  "hurricane",
  "cyclone",
  "typhoon",
  "volcano",
  "flood",
  "disaster",
  "terremoto",
  "maremoto",
  "furacão",
  "furacao",
  "incêndio florestal",
  "incendio florestal",
  "vulcão",
  "vulcao",
  "inundação",
  "inundacao",
  "desastre natural",
  "séisme",
  "seisme",
  "incendie",
  "ouragan",
  "volcan",
  "inondation",
  "catastrophe naturelle",
  "erdbeben",
  "waldbrand",
  "vulkan",
  "überschwemmung",
  "uberschwemmung",
  "naturkatastrophe",
  "huracán",
  "huracan",
  "terremoto",
  "inundación",
  "inundacion",
  "desastre natural",
  "भूकंप",
  "बाढ़",
  "चक्रवात",
  "प्राकृतिक आपदा",
];

const WARNING_WORDS = [
  "warning",
  "advisory",
  "alert",
  "travel warning",
  "alerta",
  "aviso",
  "advertência",
  "advertencia",
  "alerte",
  "avertissement",
  "warnung",
  "hinweis",
  "चेतावनी",
  "एडवाइजरी",
];

const DISRUPTION_WORDS = [
  "strike",
  "protest",
  "flight disruption",
  "flight cancel",
  "shutdown",
  "closure",
  "riot",
  "greve",
  "protesto",
  "cancelamento de voo",
  "manifestação",
  "manifestacao",
  "grève",
  "greve",
  "manifestation",
  "vols annulés",
  "vols annules",
  "streik",
  "protest",
  "flugausfälle",
  "flugausfalle",
  "huelga",
  "protesta",
  "vuelos cancelados",
  "हड़ताल",
  "विरोध प्रदर्शन",
  "उड़ान बाधा",
];

function matchesAny(haystack: string, words: string[]): boolean {
  return words.some((word) => haystack.includes(word));
}

/**
 * Classifies a headline into a severity bucket, checked in priority order
 * (a headline mentioning both an earthquake and a strike reads as
 * "disaster"). Returns null when nothing matches — most headlines won't.
 */
export function classifyHeadline(title: string): NewsSeverity | null {
  const lower = title.toLowerCase();
  if (matchesAny(lower, DISASTER_WORDS)) return "disaster";
  if (matchesAny(lower, WARNING_WORDS)) return "warning";
  if (matchesAny(lower, DISRUPTION_WORDS)) return "disruption";
  return null;
}
