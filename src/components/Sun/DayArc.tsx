"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { useTranslations } from "next-intl";
import type { SunTimes } from "@/lib/sun";
import { sunAltitudeDeg } from "@/lib/sun";
import type { HourFormat } from "@/stores/settingsStore";
import { SunGlyphPaths, MoonGlyphPaths } from "@/components/icons/SunMoonIcons";

interface DayArcProps {
  sunTimes: SunTimes;
  /** The city's current local time, used to place the "now" sun marker. */
  now: DateTime;
  /** Latitude, needed for the "sun now" elevation tooltip. */
  lat: number;
  hourFormat: HourFormat;
  showGoldenHour: boolean;
  showTwilight: boolean;
}

const WIDTH = 280;
const HEIGHT = 140;
const HORIZON_Y = 96;
const ARC_START_X = 30;
const ARC_END_X = WIDTH - 30;
const ARC_PEAK_Y = 22;
const NOT_AVAILABLE = "—";

type TooltipKey =
  | "sunrise"
  | "sunset"
  | "solarNoon"
  | "goldenMorning"
  | "goldenEvening"
  | "twilightMorning"
  | "twilightEvening"
  | "sunNow";

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

function clampPct(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface TooltipContent {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

/**
 * A sober day-arc visual: horizon line, an arc from sunrise to sunset
 * (peaking at solar noon), the current sun position when it's daytime, and
 * — when the corresponding filters are on — a warm golden-hour highlight
 * near each end of the arc and small twilight markers past each end.
 *
 * Every element that isn't self-explanatory (twilight dots, golden-hour
 * segments, the current sun marker) has a tap/hover/focus tooltip with its
 * name and time, sunrise/sunset/solar-noon get a visible time label right
 * on the chart, and a small legend below explains the remaining colors.
 * Handles the midnight-sun / polar-night states with a plain full-width bar
 * instead of a nonsensical arc.
 */
export default function DayArc({ sunTimes, now, lat, hourFormat, showGoldenHour, showTwilight }: DayArcProps) {
  const t = useTranslations("Sun");
  const [hoverKey, setHoverKey] = useState<TooltipKey | null>(null);
  const [pinnedKey, setPinnedKey] = useState<TooltipKey | null>(null);
  const activeKey = pinnedKey ?? hoverKey;

  const timeFormat = hourFormat === "24" ? "HH:mm" : "h:mm a";
  const fmt = (dt: DateTime | null) => (dt ? dt.toFormat(timeFormat) : NOT_AVAILABLE);
  const range = (start: DateTime | null, end: DateTime | null) =>
    start && end ? `${fmt(start)} – ${fmt(end)}` : NOT_AVAILABLE;

  const alwaysUpLabel = t("sunNeverSets");
  const alwaysDownLabel = t("sunNeverRises");

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
        <g transform={`translate(${WIDTH / 2 - 8}, ${HEIGHT / 2 - 22})`} stroke="var(--foreground)" opacity={0.7}>
          {isUp ? <SunGlyphPaths /> : <MoonGlyphPaths />}
        </g>
        <text x={WIDTH / 2} y={HEIGHT / 2 + 20} textAnchor="middle" fontSize={13} fill="var(--foreground)" opacity={0.7}>
          {isUp ? alwaysUpLabel : alwaysDownLabel}
        </text>
      </svg>
    );
  }

  const { sunrise, sunset, solarNoon } = sunTimes;
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
  const sunAltitude = isDaytime ? sunAltitudeDeg(lat, now, solarNoon, sunTimes.declinationDeg) : null;

  const twilightLines = (which: "dawn" | "dusk") =>
    [
      { label: t("civilTwilight"), band: sunTimes.civil },
      { label: t("nauticalTwilight"), band: sunTimes.nautical },
      { label: t("astronomicalTwilight"), band: sunTimes.astronomical },
    ].map(({ label, band }) => `${label}: ${band.state === "normal" ? fmt(band[which]) : NOT_AVAILABLE}`);

  const tooltipFor = (key: TooltipKey): TooltipContent | null => {
    switch (key) {
      case "sunrise":
        return { x: ARC_START_X, y: HORIZON_Y, title: t("sunrise"), lines: [fmt(sunrise)] };
      case "sunset":
        return { x: ARC_END_X, y: HORIZON_Y, title: t("sunset"), lines: [fmt(sunset)] };
      case "solarNoon":
        return { x: WIDTH / 2, y: ARC_PEAK_Y, title: t("solarNoon"), lines: [fmt(solarNoon)] };
      case "goldenMorning":
        return goldenMorningT !== null
          ? {
              ...arcPoint(goldenMorningT / 2),
              title: t("dayArcGoldenMorning"),
              lines: [range(sunTimes.goldenHourMorning.start, sunTimes.goldenHourMorning.end)],
            }
          : null;
      case "goldenEvening":
        return goldenEveningT !== null
          ? {
              ...arcPoint((goldenEveningT + 1) / 2),
              title: t("dayArcGoldenEvening"),
              lines: [range(sunTimes.goldenHourEvening.start, sunTimes.goldenHourEvening.end)],
            }
          : null;
      case "twilightMorning":
        return {
          x: ARC_START_X - 10,
          y: HORIZON_Y,
          title: t("dayArcTwilightMorning"),
          lines: twilightLines("dawn"),
        };
      case "twilightEvening":
        return {
          x: ARC_END_X + 10,
          y: HORIZON_Y,
          title: t("dayArcTwilightEvening"),
          lines: twilightLines("dusk"),
        };
      case "sunNow":
        return sunPos && sunAltitude !== null
          ? {
              ...sunPos,
              title: t("dayArcSunNow"),
              lines: [t("dayArcElevation", { degrees: Math.round(sunAltitude) })],
            }
          : null;
      default:
        return null;
    }
  };

  const tooltip = activeKey ? tooltipFor(activeKey) : null;

  const handlersFor = (key: TooltipKey, ariaLabel: string) => ({
    onMouseEnter: () => setHoverKey(key),
    onMouseLeave: () => setHoverKey((k) => (k === key ? null : k)),
    onFocus: () => setHoverKey(key),
    onBlur: () => setHoverKey((k) => (k === key ? null : k)),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setPinnedKey((k) => (k === key ? null : key));
    },
    tabIndex: 0,
    role: "button" as const,
    "aria-label": ariaLabel,
    style: { cursor: "pointer" },
  });

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={t("pageTitle")}
        onClick={() => setPinnedKey(null)}
      >
        {/* Horizon */}
        <line x1={4} y1={HORIZON_Y} x2={WIDTH - 4} y2={HORIZON_Y} stroke="var(--border)" strokeWidth={1.5} />

        {/* Midnight reference ticks at the horizon's far ends (approximate —
            the arc between sunrise/sunset isn't drawn to a literal 24h time
            scale, see arcPoint's doc comment). */}
        <g aria-label={t("dayArcMidnight")} opacity={0.3}>
          <text x={10} y={HORIZON_Y - 6} textAnchor="middle" fontSize={7} fill="var(--foreground)">
            00:00
          </text>
          <text x={WIDTH - 10} y={HORIZON_Y - 6} textAnchor="middle" fontSize={7} fill="var(--foreground)">
            00:00
          </text>
        </g>

        {/* Twilight markers, past each end of the day arc */}
        {showTwilight && (
          <>
            <circle cx={ARC_START_X - 10} cy={HORIZON_Y} r={2.5} fill="var(--foreground)" opacity={0.35} />
            <circle
              cx={ARC_START_X - 10}
              cy={HORIZON_Y}
              r={10}
              fill="transparent"
              {...handlersFor("twilightMorning", `${t("dayArcTwilightMorning")}: ${twilightLines("dawn").join(", ")}`)}
            />
            <circle cx={ARC_END_X + 10} cy={HORIZON_Y} r={2.5} fill="var(--foreground)" opacity={0.35} />
            <circle
              cx={ARC_END_X + 10}
              cy={HORIZON_Y}
              r={10}
              fill="transparent"
              {...handlersFor("twilightEvening", `${t("dayArcTwilightEvening")}: ${twilightLines("dusk").join(", ")}`)}
            />
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
          <>
            <path
              d={arcSegmentPath(0, goldenMorningT)}
              fill="none"
              stroke="var(--warning)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <path
              d={arcSegmentPath(0, goldenMorningT)}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              strokeLinecap="round"
              {...handlersFor(
                "goldenMorning",
                `${t("dayArcGoldenMorning")}: ${range(sunTimes.goldenHourMorning.start, sunTimes.goldenHourMorning.end)}`,
              )}
            />
          </>
        )}
        {showGoldenHour && goldenEveningT !== null && (
          <>
            <path
              d={arcSegmentPath(goldenEveningT, 1)}
              fill="none"
              stroke="var(--warning)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <path
              d={arcSegmentPath(goldenEveningT, 1)}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              strokeLinecap="round"
              {...handlersFor(
                "goldenEvening",
                `${t("dayArcGoldenEvening")}: ${range(sunTimes.goldenHourEvening.start, sunTimes.goldenHourEvening.end)}`,
              )}
            />
          </>
        )}

        {/* Solar noon marker, top of the arc */}
        <circle cx={WIDTH / 2} cy={ARC_PEAK_Y} r={3} fill="var(--foreground)" opacity={0.5} />
        <circle
          cx={WIDTH / 2}
          cy={ARC_PEAK_Y}
          r={10}
          fill="transparent"
          {...handlersFor("solarNoon", `${t("solarNoon")}: ${fmt(solarNoon)}`)}
        />
        <text x={WIDTH / 2} y={ARC_PEAK_Y - 8} textAnchor="middle" fontSize={9} fill="var(--foreground)" opacity={0.6}>
          {fmt(solarNoon)}
        </text>

        {/* Sunrise / sunset markers + time labels */}
        <circle cx={ARC_START_X} cy={HORIZON_Y} r={3} fill="var(--foreground)" opacity={0.5} />
        <circle
          cx={ARC_START_X}
          cy={HORIZON_Y}
          r={10}
          fill="transparent"
          {...handlersFor("sunrise", `${t("sunrise")}: ${fmt(sunrise)}`)}
        />
        <text x={ARC_START_X} y={HORIZON_Y + 16} textAnchor="middle" fontSize={9} fill="var(--foreground)" opacity={0.6}>
          {fmt(sunrise)}
        </text>

        <circle cx={ARC_END_X} cy={HORIZON_Y} r={3} fill="var(--foreground)" opacity={0.5} />
        <circle
          cx={ARC_END_X}
          cy={HORIZON_Y}
          r={10}
          fill="transparent"
          {...handlersFor("sunset", `${t("sunset")}: ${fmt(sunset)}`)}
        />
        <text x={ARC_END_X} y={HORIZON_Y + 16} textAnchor="middle" fontSize={9} fill="var(--foreground)" opacity={0.6}>
          {fmt(sunset)}
        </text>

        {/* Current sun position */}
        {sunPos && (
          <>
            <circle cx={sunPos.x} cy={sunPos.y} r={5.5} fill="var(--warning)" stroke="var(--background)" strokeWidth={1.5} />
            <circle
              cx={sunPos.x}
              cy={sunPos.y}
              r={12}
              fill="transparent"
              {...handlersFor(
                "sunNow",
                `${t("dayArcSunNow")}: ${sunAltitude !== null ? t("dayArcElevation", { degrees: Math.round(sunAltitude) }) : ""}`,
              )}
            />
          </>
        )}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-[170px] -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-2 py-1 text-[10px] leading-snug whitespace-nowrap text-foreground shadow-md"
          style={{
            left: `${clampPct((tooltip.x / WIDTH) * 100, 14, 86)}%`,
            top: `${Math.max((tooltip.y / HEIGHT) * 100 - 2, 6)}%`,
          }}
        >
          <p className="font-semibold">{tooltip.title}</p>
          {tooltip.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-foreground/45">
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: "var(--warning)" }} />
          {t("dayArcSunNow")}
        </span>
        {showGoldenHour && (
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1 w-3 rounded-full" style={{ background: "var(--warning)" }} />
            {t("filterGoldenHour")}
          </span>
        )}
        {showTwilight && (
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground opacity-35" />
            {t("filterTwilight")}
          </span>
        )}
      </div>
    </div>
  );
}
