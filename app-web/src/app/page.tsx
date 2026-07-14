"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { GlobeMode } from "@/components/Globe/EarthGlobe";
import MetricBar from "@/components/Controls/MetricBar";
import SidePanel from "@/components/Country/SidePanel";
import Legend from "@/components/Controls/Legend";
import StoryPanel from "@/components/Story/StoryPanel";
import Heartbeat from "@/components/Heartbeat/Heartbeat";
import Companionship from "@/components/Story/Companionship";
import AskTheData from "@/components/Ask/AskTheData";
import { computeWorldStats, worldStory, countryStory } from "@/lib/story";

// Client-only: three / react-globe.gl must never load during prerender.
const EarthGlobe = dynamic(() => import("@/components/Globe/EarthGlobe"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-fg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <span className="text-xs tracking-wide">Loading the world…</span>
      </div>
    </div>
  ),
});
import type {
  Metric,
  Gender,
  CountryTimeUse,
  WorkingHoursBroad,
  CountryMetrics,
  City,
  CompanionshipData,
} from "@/lib/types";

import timeuseRaw from "@/data/timeuse.json";
import workingRaw from "@/data/working_hours.json";
import metricsRaw from "@/data/metrics.json";
import citiesRaw from "@/data/cities.json";
import companionshipRaw from "@/data/companionship_us.json";

const timeuse = timeuseRaw as CountryTimeUse[];
const working = workingRaw as WorkingHoursBroad[];
const metrics = metricsRaw as CountryMetrics[];
const cities = citiesRaw as City[];
const companionship = companionshipRaw as CompanionshipData;

export default function Home() {
  const [metric, setMetric] = useState<Metric>("work");
  const [gender, setGender] = useState<Gender>("both");
  const [mode, setMode] = useState<GlobeMode>("data");
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0); // 0 out … 1 in — dims/shrinks panels

  // As the user zooms in, fade + shrink the overlay panels so they liquify out
  // of the way of the globe. Clamped so they never fully vanish or shrink away.
  const panelStyle = {
    opacity: 1 - zoom * 0.7,
    transform: `scale(${1 - zoom * 0.18})`,
    transformOrigin: "top left" as const,
    transition: "opacity 120ms linear, transform 120ms linear",
    pointerEvents: zoom > 0.7 ? ("none" as const) : ("auto" as const),
  };
  // Right panel is anchored top-right (below the mode toggle) with a capped
  // height so it never collides with the bottom metric bar.
  const panelStyleRight = {
    ...panelStyle,
    transformOrigin: "top right" as const,
  };

  const selectedCountry = useMemo(
    () => timeuse.find((d) => d.code === selected) ?? null,
    [selected],
  );
  const selectedMetrics = useMemo(
    () => metrics.find((d) => d.code === selected) ?? null,
    [selected],
  );

  const worldAvgLeisure = useMemo(() => {
    const vals = timeuse.map((d) => d.leisureMin).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, []);

  const worldStats = useMemo(() => computeWorldStats(timeuse, metrics), []);

  // Synthetic "World average" record so the RIGHT panel (radial clock + numbers)
  // shows the world's average day by default, mirroring the left story panel.
  const worldAvgCountry = useMemo<CountryTimeUse>(() => {
    const mean = (get: (d: CountryTimeUse) => number | null) => {
      const v = timeuse.map(get).filter((x): x is number => x != null);
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
    };
    return {
      country: "World average",
      code: "WORLD",
      region: `${worldStats.countriesWithTimeUse} surveyed countries`,
      population: 0,
      leisureWomenMin: mean((d) => d.leisureWomenMin),
      leisureMenMin: mean((d) => d.leisureMenMin),
      leisureMin: mean((d) => d.leisureMin),
      workMin: mean((d) => d.workMin),
      workYear: null,
    };
  }, [worldStats]);

  const worldAvgMetrics = useMemo<CountryMetrics>(() => {
    const mean = (k: keyof CountryMetrics) => {
      const v = metrics.map((d) => d[k]).filter((x): x is number => typeof x === "number");
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
    };
    return {
      code: "WORLD",
      country: "World average",
      happiness: mean("happiness"),
      lifeExpectancy: mean("lifeExpectancy"),
      fertility: mean("fertility"),
      internet: mean("internet"),
      dailyBirths: worldStats.worldDailyBirths,
      dailyDeaths: worldStats.worldDailyDeaths,
    };
  }, [worldStats]);
  const story = useMemo(() => {
    if (selected) {
      const s = countryStory(selected, timeuse, metrics, worldStats);
      if (s && s.paragraphs.length) {
        return { title: s.title, subtitle: "How this country spends its day", paragraphs: s.paragraphs, isWorld: false };
      }
    }
    return {
      title: "The world's average day",
      subtitle: `Across ${worldStats.countriesWithMetrics} countries`,
      paragraphs: worldStory(worldStats),
      isWorld: true,
    };
  }, [selected, worldStats]);

  // Heartbeat uses time-use (work/leisure). If the selected country has it, use
  // that; otherwise fall back to the world-average day.
  const heartbeatCountry =
    selectedCountry && (selectedCountry.workMin != null || selectedCountry.leisureMin != null)
      ? selectedCountry
      : worldAvgCountry;
  const heartbeatLabel =
    heartbeatCountry.code === "WORLD" ? "the world" : heartbeatCountry.country;

  return (
    <main className="cosmos relative flex-1">
      {/* HERO */}
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <EarthGlobe
            timeuse={timeuse}
            working={working}
            metrics={metrics}
            cities={cities}
            metric={metric}
            gender={gender}
            mode={mode}
            selected={selected}
            onSelect={setSelected}
            onZoom={setZoom}
          />
        </div>

        {/* Title */}
        <div className="pointer-events-none absolute left-6 top-8 z-10 max-w-xl md:left-12">
          <h1 className="display text-5xl md:text-7xl">
            24 Hours <span className="display-italic text-accent-warm">on Earth</span>
          </h1>
          <p className="mt-2 text-sm text-fg-muted md:text-base">
            How the world sleeps, works, and lives.
          </p>
        </div>

        {/* Story panel — world by default, country on click — LEFT.
            Sits below the (large serif) title; capped height clears the legend. */}
        <div
          className="absolute left-6 top-44 z-10 max-h-[calc(100vh-22rem)] overflow-y-auto md:left-12 md:top-52"
          style={panelStyle}
        >
          <StoryPanel
            title={story.title}
            subtitle={story.subtitle}
            paragraphs={story.paragraphs}
            isWorld={story.isWorld}
          />
        </div>

        {/* Realistic / Data toggle — TOP RIGHT */}
        <div className="absolute right-6 top-8 z-20">
          <fieldset
            className="flex items-center gap-1 rounded-xl border border-border bg-panel/85 p-1.5 backdrop-blur"
            aria-label="Globe mode"
          >
            <legend className="sr-only">Globe mode</legend>
            {(["realistic", "data"] as GlobeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  mode === m ? "bg-accent font-medium text-black" : "text-fg-muted hover:text-fg"
                }`}
              >
                {m === "realistic" ? "🌍 Realistic" : "📊 Data"}
              </button>
            ))}
          </fieldset>
        </div>

        {/* Legend — bottom left, under the story panel. Shown in both modes so
            it stays consistent with the always-visible metric bar. */}
        <div className="pointer-events-none absolute bottom-6 left-6 z-10 md:left-12">
          <Legend metric={metric} />
        </div>

        {/* Metric controls (bottom center) — always visible. Picking a metric
            in Realistic mode auto-switches to Data so the choice takes effect. */}
        <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2">
          <MetricBar
            metric={metric}
            gender={gender}
            mode="data"
            onMetric={(m) => {
              setMetric(m);
              setMode("data");
            }}
            onGender={setGender}
          />
        </div>

        {/* Side panel — country on click, world average by default.
            Aligned to the SAME top as the left story panel; extends further down. */}
        <div
          className="pointer-events-none absolute right-6 top-44 z-10 max-h-[calc(100vh-16rem)] overflow-y-auto md:top-52"
          style={panelStyleRight}
        >
          <SidePanel
            country={selected ? selectedCountry : worldAvgCountry}
            metrics={selected ? selectedMetrics : worldAvgMetrics}
            worldAvgLeisure={worldAvgLeisure}
            onClose={() => setSelected(null)}
            showClose={Boolean(selected)}
          />
        </div>

        {/* soft fade so the globe dissolves into the cosmos below — no hard seam */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 z-[5]"
          style={{ background: "linear-gradient(180deg, transparent, #05070f)" }}
          aria-hidden
        />
      </section>

      {/* 24-HOUR HEARTBEAT SIMULATION */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-leisure">
          The 24-hour heartbeat
        </p>
        <h2 className="display mt-1 text-4xl md:text-5xl">
          Watch a day unfold — <span className="display-italic text-leisure">{heartbeatLabel}</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          Each dot is one of a thousand people. As the clock advances, they move
          between sleeping, working, leisure, and the small tasks of daily life —
          revealing the shared rhythm of a single day.
          {selected ? " Showing your selected country." : " Showing the world average — click a country on the globe to compare."}
        </p>
        <div className="mt-6">
          <Heartbeat
            workMin={heartbeatCountry.workMin}
            leisureMin={heartbeatCountry.leisureMin}
            label={heartbeatLabel}
          />
        </div>
        <p className="mt-3 text-[10px] leading-4 text-fg-muted">
          Daily totals (work, leisure, sleep &amp; personal) are from measured
          data (OECD/OWID time use). The <em>time-of-day arrangement</em> is an
          illustrative typical-day template — per-hour data isn&apos;t collected
          for most countries.
        </p>
      </section>

      {/* US COMPANIONSHIP — a lifetime scrollytelling story */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-unpaid">
          A lifetime, one day at a time
        </p>
        <h2 className="display mt-1 text-4xl md:text-5xl">Who we spend our hours with</h2>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          The 24-hour day changes shape across a lifetime. Using the American Time
          Use Survey, here&apos;s how the people around us shift from age 15 to 80.
        </p>
        <p className="mt-1.5 max-w-2xl text-[10px] leading-4 text-fg-muted/70">
          Source: American Time Use Survey (via Our World in Data) · hours per day
          with each relationship, United States · categories can overlap.
        </p>
        <div className="mt-8">
          <Companionship data={companionship} />
        </div>
      </section>

      {/* ASK THE DATA — natural-language query over the datasets (GenAI) */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-accent">
          Explore for yourself
        </p>
        <h2 className="display mt-1 text-center text-4xl md:text-5xl">Ask the data</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-fg-muted">
          Curious about how the world lives? Ask a question in plain English and
          get an answer straight from the data.
        </p>
        <div className="mt-8">
          <AskTheData timeuse={timeuse} metrics={metrics} />
        </div>
      </section>

      {/* FOOTER — sources & credits */}
      <footer className="border-t border-border/50 px-6 py-10 text-center text-xs text-fg-muted">
        <p className="mx-auto max-w-2xl leading-5">
          <strong className="text-fg">24 Hours on Earth</strong> · Analyticon Viz
          Con 2026. Data: OECD &amp; Our World in Data (time use), World Happiness
          Report, UN/OWID demographics, FAO (food), Eurostat (commute), American
          Time Use Survey, GeoNames (cities), Natural Earth (boundaries). All
          public &amp; cited. Built with React, Next.js, D3, three-globe, and Claude.
        </p>
        <p className="mt-3 text-fg-muted">
          Built by{" "}
          <a
            href="https://atoz.amazon.work/phonetool/users/vnpras"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            @vnpras
          </a>
        </p>
      </footer>
    </main>
  );
}
