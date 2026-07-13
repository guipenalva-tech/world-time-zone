import { WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT } from "./worldLandPath";

/**
 * Shared equirectangular projection for Map View: the same linear
 * lon/lat -> x/y mapping used to generate worldLandPath.ts, so the land
 * silhouette, the night terminator, and the city markers all line up in
 * the same WORLD_MAP_WIDTH x WORLD_MAP_HEIGHT coordinate space.
 */
export function project(lon: number, lat: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * WORLD_MAP_WIDTH;
  const y = ((90 - lat) / 180) * WORLD_MAP_HEIGHT;
  return { x, y };
}

/** Builds an SVG path 'd' string from a closed ring of [lon, lat] points. */
export function pointsToPathD(points: Array<[number, number]>): string {
  return (
    points
      .map(([lon, lat], i) => {
        const { x, y } = project(lon, lat);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join("") + "Z"
  );
}

export { WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT };
