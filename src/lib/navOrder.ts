/**
 * Shared source of truth for the 9 top-level nav routes and their default
 * order. Kept dependency-free (no JSX, no next-intl) so it can be imported
 * from both the Zustand store (for defaults/migration) and the nav UI
 * (for rendering) without pulling either into the other.
 */

/** All 9 top-level routes, in the product-defined default order. */
export const NAV_IDS = [
  "/",
  "/chart",
  "/weather",
  "/flights",
  "/news",
  "/currency",
  "/map",
  "/sun",
  "/alerts",
] as const;

export type NavId = (typeof NAV_IDS)[number];

export const DEFAULT_NAV_ORDER: NavId[] = [...NAV_IDS];

/**
 * Reconciles a persisted (or locally-edited) nav order against the current
 * set of valid ids: unknown ids (routes that no longer exist) are dropped,
 * and new ids (routes added since the order was saved) are appended at the
 * end, in their default-order position relative to each other. Called on
 * every hydration so the settings store never needs another version bump
 * just because a page was added or removed.
 */
export function reconcileNavOrder(
  order: readonly string[],
  validIds: readonly string[] = NAV_IDS,
): NavId[] {
  const validSet = new Set(validIds);
  const kept = order.filter((id): id is NavId => validSet.has(id));
  const keptSet = new Set(kept);
  const appended = validIds.filter((id) => !keptSet.has(id)) as NavId[];
  return [...kept, ...appended];
}

/** Moves the item at `from` to index `to`, returning a new array. No-op on out-of-range indices. */
export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= arr.length ||
    to >= arr.length
  ) {
    return [...arr];
  }
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
