"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import type { CountryTimeUse } from "@/lib/types";
import { ACTIVITY_COLORS } from "@/lib/types";

interface Props {
  data: CountryTimeUse;
  size?: number;
}

interface Segment {
  label: string;
  minutes: number;
  color: string;
  derived?: boolean;
}

// Build a 24h (1440 min) breakdown. Measured: leisure, work (derived from
// annual hours). Remainder = "sleep & everything else" — labelled honestly,
// not fabricated as pure sleep.
function segments(d: CountryTimeUse): Segment[] {
  const leisure = d.leisureMin ?? 0;
  const work = d.workMin ?? 0;
  const remainder = Math.max(0, 1440 - leisure - work);
  return [
    { label: "Work", minutes: work, color: ACTIVITY_COLORS.work, derived: true },
    { label: "Leisure", minutes: leisure, color: ACTIVITY_COLORS.leisure },
    {
      label: "Sleep & personal",
      minutes: remainder,
      color: ACTIVITY_COLORS.sleep,
      derived: true,
    },
  ];
}

export default function RadialClock({ data, size = 280 }: Props) {
  const segs = useMemo(() => segments(data), [data]);
  const r = size / 2;
  const inner = r * 0.55;

  // Map minutes onto a 24h dial (12 at top, clockwise).
  const scale = d3
    .scaleLinear()
    .domain([0, 1440])
    .range([0, 2 * Math.PI]);

  let acc = 0;
  const arcs = segs.map((s) => {
    const start = acc;
    acc += s.minutes;
    const arc = d3
      .arc<null>()
      .innerRadius(inner)
      .outerRadius(r - 6)
      .startAngle(scale(start))
      .endAngle(scale(acc))
      .padAngle(0.012)
      .cornerRadius(4);
    return { d: arc(null)!, ...s };
  });

  const fmt = (m: number) => `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;

  return (
    <figure className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`${-r} ${-r} ${size} ${size}`}
        role="img"
        aria-label={`24-hour breakdown for ${data.country}: ${segs
          .map((s) => `${s.label} ${fmt(s.minutes)}`)
          .join(", ")}`}
      >
        {/* hour ticks */}
        {d3.range(24).map((h) => {
          const a = scale(h * 60) - Math.PI / 2;
          // round to avoid server/client float mismatch (hydration warning)
          const rnd = (n: number) => Math.round(n * 100) / 100;
          const x1 = rnd(Math.cos(a) * (r - 4));
          const y1 = rnd(Math.sin(a) * (r - 4));
          const x2 = rnd(Math.cos(a) * (r + (h % 6 === 0 ? 6 : 3)));
          const y2 = rnd(Math.sin(a) * (r + (h % 6 === 0 ? 6 : 3)));
          return (
            <line
              key={h}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--border)"
              strokeWidth={h % 6 === 0 ? 2 : 1}
            />
          );
        })}
        {arcs.map((a) => (
          <path key={a.label} d={a.d} fill={a.color} opacity={0.92}>
            <title>{`${a.label}: ${fmt(a.minutes)}`}</title>
          </path>
        ))}
        <text
          textAnchor="middle"
          className="fill-fg"
          style={{ fontSize: 13, fontWeight: 600 }}
          y={-4}
        >
          {data.country}
        </text>
        <text
          textAnchor="middle"
          className="fill-fg-muted"
          style={{ fontSize: 10 }}
          y={12}
        >
          a day in 24h
        </text>
      </svg>
      <figcaption className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {segs.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-fg-muted">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: s.color }}
            />
            {s.label} — {fmt(s.minutes)}
            {s.derived && <sup className="text-accent-warm">*</sup>}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
