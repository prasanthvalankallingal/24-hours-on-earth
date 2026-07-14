"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACTIVITIES,
  ACTIVITY_META,
  dayTotals,
  fractionsAtHour,
  fmtClock,
  type Activity,
  type DayTotals,
} from "@/lib/schedule";

interface Props {
  workMin: number | null;
  leisureMin: number | null;
  label: string; // e.g. "the world" or a country name
}

const N = 1000; // agents (people)
const COLS = 4;

// One dot = one of N people. Each has a home target zone that changes as the
// day's activity mix shifts; positions ease toward the zone with jitter.
interface Dot {
  x: number;
  y: number;
  tx: number;
  ty: number;
  act: Activity;
}

export default function Heartbeat({ workMin, leisureMin, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef<number>(0);
  const clockRef = useRef(8); // start at 8am
  const [playing, setPlaying] = useState(true);
  const [clockDisplay, setClockDisplay] = useState("08:00");
  const [reduced, setReduced] = useState(false);
  const [size, setSize] = useState({ w: 900, h: 420 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const totalsRef = useRef<DayTotals>(dayTotals(workMin, leisureMin));
  useEffect(() => {
    totalsRef.current = dayTotals(workMin, leisureMin);
  }, [workMin, leisureMin]);

  // reduced motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) setPlaying(false);
    const h = () => setReduced(mq.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);

  // responsive
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((e) => {
      const r = e[0].contentRect;
      setSize({ w: r.width, h: Math.max(320, Math.min(460, r.width * 0.42)) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // zone centre for an activity (4 columns)
  const zoneCenter = (a: Activity, w: number, h: number) => {
    const i = ACTIVITIES.indexOf(a);
    const colW = w / COLS;
    return { cx: colW * i + colW / 2, cy: h * 0.55 };
  };

  // init dots
  useEffect(() => {
    const dots: Dot[] = [];
    for (let i = 0; i < N; i++) {
      dots.push({ x: Math.random() * size.w, y: Math.random() * size.h, tx: 0, ty: 0, act: "sleep" });
    }
    dotsRef.current = dots;
  }, [size.w, size.h]);

  // assign dots to activities matching the fractions at the current hour
  const assign = (t: number) => {
    const fr = fractionsAtHour(t, totalsRef.current);
    const counts: Record<Activity, number> = { sleep: 0, work: 0, leisure: 0, other: 0 };
    for (const a of ACTIVITIES) counts[a] = Math.round(fr[a] * N);
    // fix rounding to sum N
    let total = ACTIVITIES.reduce((s, a) => s + counts[a], 0);
    while (total < N) { counts.sleep++; total++; }
    while (total > N) { counts.sleep = Math.max(0, counts.sleep - 1); total--; }

    const dots = dotsRef.current;
    let idx = 0;
    for (const a of ACTIVITIES) {
      for (let k = 0; k < counts[a]; k++) {
        const d = dots[idx++];
        if (!d) break;
        if (d.act !== a) {
          const { cx, cy } = zoneCenter(a, size.w, size.h);
          const spread = Math.min(size.w / COLS, size.h) * 0.42;
          d.tx = cx + (Math.random() - 0.5) * spread;
          d.ty = cy + (Math.random() - 0.5) * spread * 1.3;
          d.act = a;
        }
      }
    }
  };

  // main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.scale(dpr, dpr);

    let last = 0;
    const step = (ts: number) => {
      const dt = last ? (ts - last) / 1000 : 0;
      last = ts;
      if (playing) {
        clockRef.current = (clockRef.current + dt * 1.2) % 24; // ~20s per day
      }
      assign(clockRef.current);

      // move
      const dots = dotsRef.current;
      ctx.clearRect(0, 0, size.w, size.h);
      for (const d of dots) {
        d.x += (d.tx - d.x) * 0.08;
        d.y += (d.ty - d.y) * 0.08;
        ctx.fillStyle = ACTIVITY_META[d.act].color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      setClockDisplay(fmtClock(clockRef.current));
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, size.w, size.h]);

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    clockRef.current = Number(e.target.value);
    setClockDisplay(fmtClock(clockRef.current));
  };

  return (
    <div ref={wrapRef} className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-black focus-visible:outline-2 focus-visible:outline-accent"
          aria-pressed={playing}
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <div className="font-mono text-2xl tabular-nums text-fg">{clockDisplay}</div>
        <input
          type="range"
          min={0}
          max={23.99}
          step={0.01}
          value={clockRef.current}
          onChange={onScrub}
          onMouseDown={() => setPlaying(false)}
          className="h-1.5 flex-1 min-w-[160px] cursor-pointer accent-accent"
          aria-label="Time of day"
        />
      </div>

      {/* zone labels */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {ACTIVITIES.map((a) => (
          <div key={a} className="flex items-center justify-center gap-1.5 text-fg-muted">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: ACTIVITY_META[a].color }}
            />
            {ACTIVITY_META[a].label}
          </div>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h }}
        className="mt-2 rounded-xl border border-border/40 bg-white/[0.02] backdrop-blur-[1px]"
        role="img"
        aria-label={`Animated simulation of how ${label} spends a 24-hour day: 1000 dots representing people move between sleep, work, leisure, and daily tasks as the clock advances.`}
      />
      {reduced && (
        <p className="mt-2 text-xs text-fg-muted">
          Motion reduced per your system setting — press Play to animate, or drag
          the slider to step through the day.
        </p>
      )}
    </div>
  );
}
