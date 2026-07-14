"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import type { CompanionshipData, CompanionshipPoint } from "@/lib/types";

interface Props {
  data: CompanionshipData;
}

type Rel = "alone" | "partner" | "children" | "family" | "friends" | "coworkers";

const REL_META: Record<Rel, { label: string; color: string }> = {
  alone: { label: "Alone", color: "#f56ea8" },
  partner: { label: "Partner", color: "#b98cff" },
  children: { label: "Children", color: "#4fd1a1" },
  family: { label: "Family", color: "#6ea8ff" },
  friends: { label: "Friends", color: "#ffb15c" },
  coworkers: { label: "Coworkers", color: "#b0b8d0" },
};
const REL_ORDER: Rel[] = ["alone", "partner", "children", "family", "friends", "coworkers"];

// Scroll steps: each highlights one relationship with a narrative beat.
const STEPS: { focus: Rel | null; title: string; body: string }[] = [
  { focus: null, title: "A lifetime of company", body: "Americans report who they spend each hour with, from age 15 to 80. Scroll to watch the people in our lives change." },
  { focus: "friends", title: "Friends fade early", body: "Time with friends peaks in our teens and drops sharply after 20 — one of the steepest declines of any relationship." },
  { focus: "coworkers", title: "The working years", body: "Coworkers fill our days through midlife, then vanish almost entirely at retirement." },
  { focus: "children", title: "Raising a family", body: "Time with children swells through our 30s and 40s, then recedes as they grow up and leave." },
  { focus: "partner", title: "A partner endures", body: "Time with a partner grows steadily and, for many, becomes the main companion of later life." },
  { focus: "alone", title: "Increasingly alone", body: "Hours spent alone rise across the whole lifespan — from under 4 a day at 15 to around 8 by 80." },
];

export default function Companionship({ data }: Props) {
  const points = data["All people"];
  const [step, setStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Observe which narrative step is centered in view.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.step);
            setStep(i);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const focus = STEPS[step].focus;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Left: narrative steps */}
      <div>
        {STEPS.map((s, i) => (
          <div
            key={i}
            data-step={i}
            ref={(el) => { stepRefs.current[i] = el; }}
            className={`flex min-h-[80vh] flex-col justify-center transition-opacity duration-300 ${
              step === i ? "opacity-100" : "opacity-40"
            }`}
          >
            {s.focus && (
              <span
                className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: `${REL_META[s.focus].color}22`, color: REL_META[s.focus].color }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: REL_META[s.focus].color }} />
                {REL_META[s.focus].label}
              </span>
            )}
            <h3 className="display text-3xl md:text-4xl">{s.title}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-fg-muted">{s.body}</p>
          </div>
        ))}
      </div>

      {/* Right: sticky chart. Pinned at a fixed offset with its NATURAL height
          (not h-screen) so it never releases early on the final step. */}
      <div className="relative">
        <div className="sticky top-[18vh]">
          <LifeChart points={points} focus={focus} />
        </div>
      </div>
    </div>
  );
}

function LifeChart({ points, focus }: { points: CompanionshipPoint[]; focus: Rel | null }) {
  const [w, setW] = useState(480);
  const h = 380;
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const m = { top: 20, right: 16, bottom: 34, left: 40 };
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;

  const x = useMemo(
    () => d3.scaleLinear().domain([15, 80]).range([0, iw]),
    [iw],
  );
  const y = useMemo(() => d3.scaleLinear().domain([0, 10]).range([ih, 0]), [ih]);

  const lines = useMemo(() => {
    return REL_ORDER.map((rel) => {
      const line = d3
        .line<CompanionshipPoint>()
        .x((d) => x(d.age))
        .y((d) => y((d[rel] as number) ?? 0))
        .curve(d3.curveCatmullRom);
      return { rel, d: line(points) ?? "" };
    });
  }, [points, x, y]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <svg width={w} height={h} role="img" aria-label="Hours per day spent with each relationship, by age, United States">
        <g transform={`translate(${m.left},${m.top})`}>
          {/* axes */}
          {y.ticks(5).map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={0} x2={iw} stroke="#1e2740" strokeWidth={1} />
              <text x={-8} y={4} textAnchor="end" className="fill-fg-muted" style={{ fontSize: 10 }}>{t}h</text>
            </g>
          ))}
          {x.ticks(6).map((t) => (
            <text key={t} x={x(t)} y={ih + 20} textAnchor="middle" className="fill-fg-muted" style={{ fontSize: 10 }}>
              {t}
            </text>
          ))}
          <text x={iw / 2} y={ih + 33} textAnchor="middle" className="fill-fg-muted" style={{ fontSize: 10 }}>age →</text>

          {lines.map(({ rel, d }) => {
            const active = focus === null || focus === rel;
            return (
              <path
                key={rel}
                d={d}
                fill="none"
                stroke={REL_META[rel as Rel].color}
                strokeWidth={focus === rel ? 3.5 : 2}
                opacity={active ? 1 : 0.15}
                style={{ transition: "opacity 300ms, stroke-width 300ms" }}
              />
            );
          })}
        </g>
      </svg>
      {/* legend */}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 px-2 text-[11px]">
        {REL_ORDER.map((rel) => (
          <span
            key={rel}
            className="flex items-center gap-1"
            style={{ opacity: focus === null || focus === rel ? 1 : 0.35, transition: "opacity 300ms" }}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: REL_META[rel].color }} />
            <span className="text-fg-muted">{REL_META[rel].label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
