"use client";

import { DateTime } from "luxon";
import type { SunTimes } from "@/lib/sun";

interface DayArcProps {
  sunTimes: SunTimes;
  /** The city's current local time, used to place the "now" sun marker. */
  now: DateTime;
  showGoldenHour: boolean;
  showTwilight: boolean;
  alwaysUpLabel: string;
  alwaysDownLabel: string;
}

const WIDTH = 280;
const HEIGHT = 120;
const HORIZON_Y = 92;
const ARC_START_X = 24;
const ARC_END_X = WIDTH - 24;
const ARC_PEAK_Y = 14;

/** Point on the quadratic Bezier (sunrise -> solar noon peak -> sunset) at
 * parameter t in [0, 1] — purely a stylized "arc of the day", not a literal
 * altitude plot (real solar altitude curves aren't this symmetric, but this
 * reads clearly at a glance and is the same abstraction most weather apps use). */
function arcPoint(t: number): { x: number; y: number } {
  const clamped = Math.min(1, Math.max(0, t));
  const x0 = ARC_START_X;
  const x1 = WIDTH / 2;
  const x2 = ARC_END_X;
  const y0 = HORIZON_Y;
  const y1 = ARC_PEAK_Y;
  const y2 = HORIZON_Y;
  const mt = 1 - clamped;
  return {
    x: mt * mt * x0 + 2 * mt * clamped * x1 + clamped * clamped * x2,
    y: mt * mt * y0 + 2 * mt * clamped * y1 + clamped * clamped * y2,
  };
}

function arcSegmentPath(t1: number, t2: number, steps = 12): string {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t1 + ((t2 - t1) * i) / steps;
    pts.push(arcPoint(t));
  }
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

/**
 * A sober day-arc visual: horizon line, an arc from sunrise to sunset
 * (peaking at solar noon), the current sun position when it's daytime, and
 * — when the corresponding filters are on — a warm golden-hour highlight
 * near each end of the arc and small twilight markers past each end.
 * Handles the midnight-sun / polar-night states with a plain full-width bar
 * instead of a nonsensical arc.
 */
export default function DayArc({
  sunTimes,
  now,
  showGoldenHour,
  showTwilight,
  alwaysUpLabel,
  alwaysDownLabel,
}: DayArcProps) {
  if (sunTimes.daylightState !== "normal") {
    const isUp = sunTimes.daylightState === "alwaysAbove";
    return (
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={isUp ? alwaysUpLabel : alwaysDownLabel}>
        <rect
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          rx={8}
          fill={isUp ? "color-mix(in srgb, var(--warning) 12%, transparent)" : "rgb(0 0 0 / 30%)"}
        />
        <text x={WIDTH / 2} y={HEIGHT / 2 + 5} textAnchor="middle" fontSize={13} fill="var(--foreground)" opacity={0.7}>
          {isUp ? "☀️" : "🌙"} {isUp ? alwaysUpLabel : alwaysDownLabel}
        </text>
      </svg>
    );
  }

  const { sunrise, sunset } = sunTimes;
  if (!sunrise || !sunset) return null;

  const totalMs = sunset.toMillis() - sunrise.toMillis();
  const nowT = totalMs > 0 ? (now.toMillis() - sunrise.toMillis()) / totalMs : -1;
  const isDaytime = nowT >= 0 && nowT <= 1;

  const goldenMorningEnd = sunTimes.goldenHourMorning.end;
  const goldenEveningStart = sunTimes.goldenHourEvening.start;
  const tFor = (dt: DateTime | null) =>
    dt && totalMs > 0 ? (dt.toMillis() - sunrise.toMillis()) / totalMs : null;
  const goldenMorningT = tFor(goldenMorningEnd);
  const goldenEveningT = tFor(goldenEveningStart);

  const sunPos = isDaytime ? arcPoint(nowT) : null;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-hidden="true">
      {/* Horizon */}
      <line x1={4} y1={HORIZON_Y} x2={WIDTH - 4} y2={HORIZON_Y} stroke="var(--border)" strokeWidth={1.5} />

      {/* Twilight markers, past each end of the day arc */}
      {showTwilight && (
        <>
          <circle cx={ARC_START_X - 10} cy={HORIZON_Y} r={2.5} fill="var(--foreground)" opacity={0.35} />
          <circle cx={ARC_END_X + 10} cy={HORIZON_Y} r={2.5} fill="var(--foreground)" opacity={0.35} />
        </>
      )}

      {/* Full day arc, subdued */}
      <path
        d={arcSegmentPath(0, 1)}
        fill="none"
        stroke="var(--foreground)"
        strokeOpacity={0.25}
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* Golden hour highlights near each end */}
      {showGoldenHour && goldenMorningT !== null && (
        <path
          d={arcSegmentPath(0, goldenMorningT)}
          fill="none"
          stroke="var(--warning)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
      {showGoldenHour && goldenEveningT !== null && (
        <path
          d={arcSegmentPath(goldenEveningT, 1)}
          fill="none"
          stroke="var(--warning)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}

      {/* Sunrise / sunset markers */}
      <circle cx={ARC_START_X} cy={HORIZON_Y} r={3} fill="var(--foreground)" opacity={0.5} />
      <circle cx={ARC_END_X} cy={HORIZON_Y} r={3} fill="var(--foreground)" opacity={0.5} />

      {/* Current sun position */}
      {sunPos && (
        <circle cx={sunPos.x} cy={sunPos.y} r={5.5} fill="var(--warning)" stroke="var(--background)" strokeWidth={1.5} />
      )}
    </svg>
  );
}
