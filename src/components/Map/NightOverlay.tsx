import { useMemo } from "react";
import { getSolarPosition, buildNightPolygon } from "@/lib/solar";
import { project, pointsToPathD } from "./projection";

interface NightOverlayProps {
  now: Date;
  subsolarLabel: string;
}

/**
 * Semi-transparent night-side overlay (the day/night terminator) plus a
 * small subsolar marker, both derived from src/lib/solar.ts and recomputed
 * whenever `now` changes (the caller ticks this once a minute).
 */
export default function NightOverlay({ now, subsolarLabel }: NightOverlayProps) {
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
      <path d={pathD} fill="rgb(0 0 0 / 38%)" stroke="none" />
      <g transform={`translate(${sunPoint.x}, ${sunPoint.y})`}>
        <title>{subsolarLabel}</title>
        <circle r={5} fill="#facc15" stroke="#fff" strokeWidth={1} />
        <circle r={9} fill="none" stroke="#facc15" strokeWidth={0.75} opacity={0.6} />
      </g>
    </>
  );
}
