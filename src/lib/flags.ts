/**
 * Country flag rendering, isolated so the implementation can be swapped
 * (e.g. for SVG assets) without touching call sites.
 *
 * Current approach: emoji flags derived from the ISO 3166-1 alpha-2 code
 * via Unicode regional indicator symbols. Zero dependencies and no network
 * requests; the known trade-off is that Windows/Chrome renders these as
 * plain letters ("BR") instead of a flag glyph.
 */
export function getFlagEmoji(countryCode: string): string {
  const cc = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(
    ...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
