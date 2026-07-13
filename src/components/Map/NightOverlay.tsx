import { useId, useMemo } from "react";
import { getSolarPosition, buildNightPolygon } from "@/lib/solar";
import { project, pointsToPathD, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT } from "./projection";
import { WORLD_LAND_PATH_D } from "./worldLandPath";

interface NightOverlayProps {
  now: Date;
  subsolarLabel: string;
}

/**
 * Day/night terminator, recomputed whenever `now` changes (the caller ticks
 * this once a minute).
 *
 * Rather than a faint translucent black wash (which was nearly invisible in
 * dark theme, where the page background is already near-black), the night
 * hemisphere is redrawn with its own deliberately darker/bluer ocean+land
 * colors (--map-night-ocean / --map-night-land), clipped to the night
 * polygon so it replaces the "day" colors from WorldMapBase only on that
 * side. A subtle warm glow sits under the subsolar point on the day side,
 * and the terminator itself gets a visible stroke, so the boundary reads
 * clearly in both themes.
 */
export default function NightOverlay({ now, subsolarLabel }: NightOverlayProps) {
  const clipId = useId();
  const glowId = useId();

  const { pathD, sunPoint } = useMemo(() => {
    const solar = getSolarPosition(now);
    const polygon = buildNightPolygon(now);
    return {
      pathD: pointsToPathD(polygon),
      sunPoint: project(solar.subsolarLonDeg, solar.declinationDeg),
    };
  }, [now]);

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <path d={pathD} />
        </clipPath>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="var(--map-day-glow)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--map-day-glow)" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Subtle warm glow around the subsolar point, on the day side. */}
      <circle cx={sunPoint.x} cy={sunPoint.y} r={140} fill={`url(#${glowId})`} />

      {/* Night hemisphere redrawn in darker/bluer colors, clipped in. */}
      <g clipPath={`url(#${clipId})`}>
        <rect x={0} y={0} width={WORLD_MAP_WIDTH} height={WORLD_MAP_HEIGHT} fill="var(--map-night-ocean)" />
        <path d={WORLD_LAND_PATH_D} fill="var(--map-night-land)" fillRule="evenodd" />
      </g>

      {/* Terminator line: a visible stroke reinforcing the day/night edge. */}
      <path d={pathD} fill="none" stroke="var(--map-terminator-stroke)" strokeWidth={1.25} />

      <g transform={`translate(${sunPoint.x}, ${sunPoint.y})`}>
        <title>{subsolarLabel}</title>
        <circle r={5} fill="#facc15" stroke="#1e293b" strokeWidth={1} />
        <circle r={9} fill="none" stroke="#facc15" strokeWidth={0.75} opacity={0.6} />
      </g>
    </>
  );
}
