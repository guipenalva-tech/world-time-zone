import { WORLD_LAND_PATH_D } from "./worldLandPath";
import { WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT } from "./projection";

/**
 * The static land/ocean silhouette, rendered in the map's "day" palette
 * (--map-day-ocean / --map-day-land). In light theme this matches the page
 * background/border tokens; in dark theme it's deliberately lifted lighter
 * than the page background so the day side of NightOverlay's terminator
 * reads as visibly "lit" rather than blending into the near-black page.
 */
export default function WorldMapBase() {
  return (
    <>
      <rect
        x={0}
        y={0}
        width={WORLD_MAP_WIDTH}
        height={WORLD_MAP_HEIGHT}
        fill="var(--map-day-ocean)"
      />
      <path d={WORLD_LAND_PATH_D} fill="var(--map-day-land)" fillRule="evenodd" />
    </>
  );
}
