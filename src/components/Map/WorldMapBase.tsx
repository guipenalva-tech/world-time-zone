import { WORLD_LAND_PATH_D } from "./worldLandPath";
import { WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT } from "./projection";

/**
 * The static land/ocean silhouette: ocean is the page background color,
 * land is a step lighter/darker than it (the --border token), so it reads
 * correctly in both light and dark themes without any map-specific colors.
 */
export default function WorldMapBase() {
  return (
    <>
      <rect
        x={0}
        y={0}
        width={WORLD_MAP_WIDTH}
        height={WORLD_MAP_HEIGHT}
        fill="var(--background)"
      />
      <path d={WORLD_LAND_PATH_D} fill="var(--border)" fillRule="evenodd" />
    </>
  );
}
