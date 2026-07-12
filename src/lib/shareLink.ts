import type { ComparedCity } from "@/types/city";

/**
 * Builds a shareable URL (comparator home, `/<locale>`) encoding the current
 * comparator state: ordered city ids, plus the selected time range if one
 * is active. Legacy `/compare?...` links still work via a next.config
 * redirect (which then gets locale-prefixed by the i18n proxy).
 */
export function buildShareUrl(
  cities: ComparedCity[],
  selectionStart: string | null,
  selectionEnd: string | null,
  locale: string,
): string {
  const ids = [...cities]
    .sort((a, b) => a.order - b.order)
    .map((c) => c.city.id);

  const params = new URLSearchParams();
  if (ids.length > 0) params.set("cities", ids.join(","));
  if (selectionStart && selectionEnd) {
    params.set("start", selectionStart);
    params.set("end", selectionEnd);
  }

  const query = params.toString();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/${locale}${query ? `?${query}` : ""}`;
}

/** Parsed share-link params read from `window.location.search`. */
export interface ShareLinkParams {
  cityIds: string[];
  start: string | null;
  end: string | null;
}

/** Reads `cities`/`start`/`end` query params from the current URL, if present. */
export function readShareLinkParams(): ShareLinkParams | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const citiesParam = params.get("cities");
  if (!citiesParam) return null;

  const cityIds = citiesParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (cityIds.length === 0) return null;

  return {
    cityIds,
    start: params.get("start"),
    end: params.get("end"),
  };
}
