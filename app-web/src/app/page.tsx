"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { GlobeMode } from "@/components/Globe/EarthGlobe";
import MetricBar from "@/components/Controls/MetricBar";
import SidePanel from "@/components/Country/SidePanel";
import Legend from "@/components/Controls/Legend";
import ThemeToggle from "@/components/Controls/ThemeToggle";
import StoryPanel from "@/components/Story/StoryPanel";
import Heartbeat from "@/components/Heartbeat/Heartbeat";
import Companionship from "@/components/Story/Companionship";
import AskTheData from "@/components/Ask/AskTheData";
import ChatWidget from "@/components/Ask/ChatWidget";
import DataTable from "@/components/Table/DataTable";
import { LiveSleepLine } from "@/components/Hero/NarrativeHook";
import { METRIC_BY_KEY } from "@/lib/types";
import { CITY_GLOW } from "@/lib/colors";
import { computeWorldStats, worldStory, countryStory } from "@/lib/story";

// Client-only globe loading fallback (three / react-globe.gl must never load
// during prerender). The component itself is imported imperatively on the
// client via useEffect (see below) rather than next/dynamic, so it mounts on a
// guaranteed post-hydration re-render instead of a Suspense boundary that could
// stay on this fallback until an unrelated click.
function GlobeFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-fg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <span className="text-xs tracking-wide">Loading the world…</span>
      </div>
    </div>
  );
}
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

  // Load the WebGL globe on the client after mount. useEffect always runs
  // post-hydration and its setState forces the re-render that shows the globe —
  // avoiding the next/dynamic Suspense fallback that could otherwise stay on
  // "Loading the world…" until an unrelated interaction.
  const [EarthGlobe, setEarthGlobe] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    import("@/components/Globe/EarthGlobe").then((m) => {
      if (alive) setEarthGlobe(() => m.default);
    });
    return () => { alive = false; };
  }, []);

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
      // Show coverage honestly: the work/leisure survey covers 33 countries,
      // while the births/deaths/diet/life figures shown alongside span up to ~237.
      region: `Time use: ${worldStats.countriesWithTimeUse} countries · life & population: ~${worldStats.countriesWithMetrics}`,
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
      // Match the side panel's coverage label: the "average day" is time-use
      // (33 countries), while the wider life & population figures span up to ~237.
      subtitle: `Time use: ${worldStats.countriesWithTimeUse} countries · life & population: ~${worldStats.countriesWithMetrics}`,
      paragraphs: worldStory(worldStats),
      isWorld: true,
    };
  }, [selected, worldStats]);

  // Focal point — the extreme country for the current metric, so the eye has
  // somewhere to land. Powers the "what you're looking at" caption.
  const focus = useMemo(() => {
    const def = METRIC_BY_KEY[metric];
    const rows: { name: string; value: number }[] = [];
    if (metric === "leisure" || metric === "work") {
      for (const d of timeuse) {
        const v = metric === "work" ? d.workMin : d.leisureMin;
        if (typeof v === "number") rows.push({ name: d.country, value: v });
      }
      if (metric === "work") {
        for (const d of working)
          if (!timeuse.find((t) => t.code === d.code))
            rows.push({ name: d.country, value: d.workMin });
      }
    } else {
      for (const d of metrics) {
        const v = d[metric];
        if (typeof v === "number") rows.push({ name: d.country, value: v });
      }
    }
    if (!rows.length) return null;
    const hi = rows.reduce((a, b) => (b.value > a.value ? b : a));
    return { label: def.label.toLowerCase(), name: hi.name, value: def.fmt(hi.value), count: rows.length };
  }, [metric]);

  // The selected country's value for the current metric (for the caption).
  const selectedFocus = useMemo(() => {
    if (!selected) return null;
    const def = METRIC_BY_KEY[metric];
    let v: number | null = null;
    let name = selectedMetrics?.country ?? selectedCountry?.country ?? "";
    if (metric === "leisure") v = selectedCountry?.leisureMin ?? null;
    else if (metric === "work")
      v = selectedCountry?.workMin ?? working.find((w) => w.code === selected)?.workMin ?? null;
    else {
      const mv = selectedMetrics?.[metric];
      v = typeof mv === "number" ? mv : null;
    }
    if (!name) return null;
    return { name, value: v != null ? def.fmt(v) : "no data" };
  }, [selected, metric, selectedCountry, selectedMetrics]);

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
      {/* Distant cosmos — planets, nebula tints and the Milky-Way band. Its own
          fixed layer (a sibling of the content, NOT an ancestor of the fixed
          ChatWidget) so it can drift on a GPU transform without becoming that
          widget's containing block. Slowest layer = farthest depth. */}
      <div className="cosmos-deep" aria-hidden="true" />
      {/* HERO */}
      <section
        className="relative h-screen w-full overflow-hidden"
        aria-label={
          focus
            ? `Interactive globe of ${focus.count} countries coloured by ${focus.label}. Highest: ${focus.name} at ${focus.value}. Click a country for its full 24-hour breakdown, or scroll for the data stories below.`
            : "Interactive globe of how the world spends its 24 hours. Scroll for the data stories below."
        }
      >
        <div className="absolute inset-0">
          {EarthGlobe ? (
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
          ) : (
            <GlobeFallback />
          )}
        </div>

        {/* Title + live narrative hook */}
        <div className="pointer-events-none absolute left-6 top-8 z-10 max-w-md md:left-12">
          <h1 className="display text-5xl md:text-7xl">
            24 Hours <span className="display-italic text-accent-warm">on Earth</span>
          </h1>
          <p className="mt-2 text-sm text-fg-muted md:text-base">
            How the world sleeps, works, and lives.
          </p>
          <div className="mt-4">
            <LiveSleepLine cities={cities} metric={metric} metrics={metrics} />
          </div>
        </div>

        {/* Story panel — world by default, country on click — LEFT.
            Overlay on desktop only; on mobile it renders stacked below the hero.
            top-72 clears the title + subtitle + live narrative hook above it. */}
        <div
          className="absolute left-6 top-40 z-10 hidden max-h-[calc(100vh-22rem)] overflow-y-auto md:left-12 md:top-60 md:block"
          style={panelStyle}
        >
          <StoryPanel
            title={story.title}
            subtitle={story.subtitle}
            paragraphs={story.paragraphs}
            isWorld={story.isWorld}
          />
        </div>

        {/* Theme + Realistic/Data toggles — floating (fixed) so they stay
            reachable no matter how far you scroll, on every screen size. On
            mobile there's no side gutter, so they shrink to icon-only chips
            stacked in the very top-right corner with an opaque panel, keeping
            them clear of the left-aligned title and section headings. On
            desktop they widen into a labelled row in the right gutter. */}
        <div className="fixed right-3 top-3 z-30 flex flex-col items-end gap-2 md:right-6 md:top-8 md:flex-row md:items-center">
            <ThemeToggle />
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
                  aria-label={m === "realistic" ? "Realistic view" : "Data view"}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                    mode === m ? "bg-accent font-medium text-white" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  <span aria-hidden>{m === "realistic" ? "🌍" : "📊"}</span>
                  <span className="hidden md:inline">
                    {m === "realistic" ? " Realistic" : " Data"}
                  </span>
                </button>
              ))}
            </fieldset>
        </div>

        {/* Legend sits just under the floating toggles (desktop), tied to the
            globe view so it scrolls away with the map. Hidden on mobile (renders
            in the stacked section below). In Data mode it's the metric colour
            ramp; in Realistic mode a matching key for the satellite view —
            never an empty gap under the selector. */}
        <div className="absolute right-6 top-[5.25rem] z-20 flex flex-col items-end">
          {mode === "data" ? (
            <div className="pointer-events-none hidden md:block">
              <Legend metric={metric} />
            </div>
          ) : (
            <div className="pointer-events-none hidden md:block">
              <div className="rounded-lg border border-border bg-panel/85 p-3 text-xs backdrop-blur">
                <div className="mb-1.5 font-medium text-fg">Realistic view</div>
                <div className="flex items-center gap-1.5 text-[10px] text-fg-muted">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: CITY_GLOW, boxShadow: `0 0 6px ${CITY_GLOW}` }}
                  />
                  major cities
                </div>
                <div className="mt-1.5 text-[10px] leading-4 text-fg-muted">
                  Day &amp; night follow the real sun.
                  <br />
                  Switch to <span className="text-fg">Data</span> to colour countries.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Focal-point caption — "what you're looking at". When a country is
            selected it names that country + its value; otherwise it names the
            extreme (Data) or explains the living-Earth view (Realistic). */}
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 px-4 text-center">
          {selected && selectedFocus ? (
            <p className="text-xs text-fg-muted">
              <span className="font-medium text-accent-warm">{selectedFocus.name}</span> ·{" "}
              {METRIC_BY_KEY[metric].label}:{" "}
              <span className="text-fg">{selectedFocus.value}</span> ·{" "}
              <span className="text-fg-muted">click empty space to reset</span>
            </p>
          ) : mode === "data" && focus ? (
            <p className="text-xs text-fg-muted">
              Globe coloured by <span className="text-fg">{focus.label}</span> ·{" "}
              {focus.count} countries · highest:{" "}
              <span className="font-medium text-accent-warm">{focus.name}</span> (
              {focus.value})
            </p>
          ) : mode === "realistic" ? (
            <p className="text-xs text-fg-muted">
              A living Earth · glowing dots mark the world&apos;s largest cities ·{" "}
              <span className="text-fg">switch to Data</span> to colour countries by a metric
            </p>
          ) : null}
        </div>

        {/* Metric controls (bottom center) — always visible. Picking a metric
            in Realistic mode auto-switches to Data so the choice takes effect.
            A navigator button hangs off the bottom so there's always a clear,
            one-click way past the globe (whose wheel is captured for zooming)
            to the data stories below. */}
        <div className="absolute bottom-4 left-1/2 z-10 flex w-max max-w-[94vw] -translate-x-1/2 flex-col items-center gap-2">
          <MetricBar
            metric={metric}
            gender={gender}
            mode="data"
            // Selecting a metric stays in the current view. In Realistic view
            // it just arms the choice — it shows the moment you toggle to Data,
            // instead of forcing you out of the satellite view.
            onMetric={setMetric}
            onGender={setGender}
          />
          <button
            type="button"
            onClick={() =>
              document.getElementById("explore")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
            className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/30 transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Scroll down to the data stories below the globe"
          >
            Explore the stories
            <span aria-hidden className="animate-bounce">↓</span>
          </button>
        </div>

        {/* Side panel — country on click, world average by default.
            Overlay on desktop only; on mobile it renders stacked below the hero. */}
        <div
          className="pointer-events-none absolute right-6 top-40 z-10 hidden max-h-[calc(100vh-18rem)] overflow-y-auto md:top-60 md:block"
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
          style={{ background: "linear-gradient(180deg, transparent, var(--bg))" }}
          aria-hidden
        />
      </section>

      {/* MOBILE-ONLY stacked panels — the desktop overlays are hidden on small
          screens (they covered the globe), so show them in normal flow here. */}
      <section className="flex flex-col items-center gap-4 px-6 py-8 md:hidden">
        {mode === "data" && <Legend metric={metric} />}
        <StoryPanel
          title={story.title}
          subtitle={story.subtitle}
          paragraphs={story.paragraphs}
          isWorld={story.isWorld}
        />
        <SidePanel
          country={selected ? selectedCountry : worldAvgCountry}
          metrics={selected ? selectedMetrics : worldAvgMetrics}
          worldAvgLeisure={worldAvgLeisure}
          onClose={() => setSelected(null)}
          showClose={Boolean(selected)}
        />
      </section>

      {/* 24-HOUR HEARTBEAT SIMULATION */}
      <section id="explore" className="mx-auto max-w-5xl px-6 py-20 scroll-mt-4">
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
        <p className="mt-1.5 max-w-2xl text-[10px] leading-4 text-fg-muted">
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

      {/* EXPLORE THE TABLE — filterable, sortable, CSV-exportable long-format
          view of every country × metric, grouped by business region. */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-work">
          Every number, one table
        </p>
        <h2 className="display mt-1 text-4xl md:text-5xl">Browse &amp; export the data</h2>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          Filter by region and metric, search for a country, sort any column,
          and download exactly what you&apos;re looking at as a CSV — the same
          public figures that power the globe above.
        </p>
        <div className="mt-8">
          <DataTable timeuse={timeuse} metrics={metrics} />
        </div>
      </section>

      {/* FOOTER — sources & credits (each dataset linked for credibility) */}
      <footer className="border-t border-border/50 px-6 py-10 text-center text-xs text-fg-muted">
        <p className="text-sm font-semibold text-fg">24 Hours on Earth</p>
        <p className="mt-0.5">Analyticon Viz Con 2026</p>

        <p className="mt-3">
          <Link
            href="/documentation"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            Read the making-of &amp; methodology <span aria-hidden>→</span>
          </Link>
        </p>

        <div className="mx-auto mt-6 max-w-2xl">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
            Data sources — all public &amp; cited
          </p>
          <p className="leading-6">
            {[
              ["Time use (leisure, work)", "https://ourworldindata.org/time-use"],
              ["World Happiness Report", "https://ourworldindata.org/grapher/happiness-cantril-ladder"],
              ["Life expectancy", "https://ourworldindata.org/grapher/life-expectancy"],
              ["Birth & death rates", "https://ourworldindata.org/grapher/crude-birth-rate"],
              ["Fertility", "https://ourworldindata.org/grapher/children-per-woman"],
              ["Internet use", "https://ourworldindata.org/grapher/share-of-individuals-using-the-internet"],
              ["Calories & meat (FAO)", "https://ourworldindata.org/grapher/daily-per-capita-caloric-supply"],
              ["Vegetables (FAO)", "https://ourworldindata.org/grapher/vegetable-consumption-per-capita"],
              ["Commute time (Eurostat)", "https://ec.europa.eu/eurostat/databrowser/view/qoe_ewcs_3c3/default/table"],
              ["Companionship (ATUS)", "https://www.bls.gov/tus/"],
              ["Population", "https://ourworldindata.org/grapher/population"],
              ["Cities (GeoNames)", "https://www.geonames.org/"],
              ["Boundaries (Natural Earth)", "https://www.naturalearthdata.com/"],
            ].map(([label, href], i, arr) => (
              <span key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg-muted underline decoration-border underline-offset-2 hover:text-accent hover:decoration-accent"
                >
                  {label}
                </a>
                {i < arr.length - 1 && <span className="mx-1 opacity-40">·</span>}
              </span>
            ))}
          </p>
        </div>

        <p className="mt-4 text-fg-muted/80">
          Built with React, Next.js, D3, three-globe, and{" "}
          <Link href="/documentation/#genai" className="font-medium text-accent hover:underline">
            Claude
          </Link>{" "}
          — by{" "}
          <a
            href="https://atoz.amazon.work/phonetool/users/vnpras"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            @vnpras
          </a>
        </p>
        <p className="mt-1 text-fg-muted/70">
          <Link href="/documentation/#genai" className="underline decoration-border underline-offset-2 hover:text-accent hover:decoration-accent">
            How AI was used →
          </Link>
        </p>
      </footer>

      {/* Floating "Ask the data" launcher — fixed bottom-left, reachable from
          anywhere on the page. Same sourced-answer engine as the inline box. */}
      <ChatWidget timeuse={timeuse} metrics={metrics} />
    </main>
  );
}
