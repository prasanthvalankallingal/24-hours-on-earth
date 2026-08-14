import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/Controls/ThemeToggle";

export const metadata: Metadata = {
  title: "Making of · 24 Hours on Earth — documentation & methodology",
  description:
    "The story, data sources, tools, methodology, and GenAI workflow behind 24 Hours on Earth. Analyticon VizCon 2026.",
};

// Every dataset used, with a public link — kept in one place so this page
// doubles as the submission's "Data Sources" deliverable.
const SOURCES: [string, string, string][] = [
  ["Time use — leisure & work", "OWID / OECD", "https://ourworldindata.org/time-use"],
  ["World Happiness Report", "OWID (Cantril ladder)", "https://ourworldindata.org/grapher/happiness-cantril-ladder"],
  ["Life expectancy", "OWID / UN", "https://ourworldindata.org/grapher/life-expectancy"],
  ["Birth & death rates", "OWID / UN", "https://ourworldindata.org/grapher/crude-birth-rate"],
  ["Fertility (children per woman)", "OWID / UN", "https://ourworldindata.org/grapher/children-per-woman"],
  ["Internet use", "OWID / ITU", "https://ourworldindata.org/grapher/share-of-individuals-using-the-internet"],
  ["Calories & meat supply", "OWID / FAO", "https://ourworldindata.org/grapher/daily-per-capita-caloric-supply"],
  ["Vegetable supply", "OWID / FAO", "https://ourworldindata.org/grapher/vegetable-consumption-per-capita"],
  ["Commute time", "Eurostat", "https://ec.europa.eu/eurostat/databrowser/view/qoe_ewcs_3c3/default/table"],
  ["Companionship by age", "American Time Use Survey (BLS)", "https://www.bls.gov/tus/"],
  ["Population", "OWID / UN", "https://ourworldindata.org/grapher/population"],
  ["City locations", "GeoNames", "https://www.geonames.org/"],
  ["Country boundaries", "Natural Earth", "https://www.naturalearthdata.com/"],
];

const TOOLS: [string, string][] = [
  ["Next.js 16", "App Router, static export (output: export) → any static host"],
  ["React + TypeScript", "component model, typed datasets"],
  ["three-globe / three.js", "the interactive 3D Earth (day/night terminator, city lights)"],
  ["D3", "scales, line generation & curve for the lifetime scrollytelling chart"],
  ["Tailwind CSS v4", "design tokens, dark/light theming"],
  ["Framer Motion", "panel & story transitions"],
  ["GitHub Pages + Actions", "public hosting, deploy on push to main"],
  ["Serverless LLM router", "a tiny Cloudflare Worker that turns questions into structured queries — see “Ask the data” below"],
  ["Claude (Claude Code)", "AI pair-programmer across the whole build — see below"],
];

function Eyebrow({ children, tone = "text-accent" }: { children: React.ReactNode; tone?: string }) {
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-widest ${tone}`}>{children}</p>
  );
}

export default function DocumentationPage() {
  return (
    <main className="mx-auto min-h-full max-w-3xl px-6 py-16">
      {/* Colour theme — floating (fixed) so it stays reachable however far you
          scroll, mirroring the dashboard's control placement. */}
      <div className="fixed right-3 top-3 z-30 md:right-6 md:top-8">
        <ThemeToggle />
      </div>

      {/* Back to the visualization */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span aria-hidden>←</span> Back to the visualization
      </Link>

      <header className="mt-6">
        <Eyebrow>Analyticon VizCon 2026 · Documentation</Eyebrow>
        <h1 className="display mt-2 text-4xl md:text-6xl">
          The making of <span className="display-italic text-accent-warm">24 Hours on Earth</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-fg-muted">
          The story, the data, the methodology, and how AI was used to build it.
          This page is the written companion to the interactive piece — the
          &ldquo;brief description,&rdquo; source list, and GenAI write-up in one place.
        </p>
      </header>

      {/* ── The story ── */}
      <section className="mt-14">
        <Eyebrow tone="text-leisure">The story</Eyebrow>
        <h2 className="display mt-1 text-3xl">One question, eight billion answers</h2>
        <div className="mt-3 space-y-4 text-[15px] leading-7 text-fg/90">
          <p>
            Every day, eight billion people wake up and spend the same 24 hours —
            but no two lives spend them the same way. <strong>24 Hours on Earth</strong> asks
            a deceptively simple question: <em>how does the world actually spend its day?</em>{" "}
            It answers on two scales at once — the shape of a single average day
            across countries, and the way that day quietly transforms across a
            human lifetime.
          </p>
          <p>
            The piece opens on a living globe you can spin, recolour by any
            metric, and click to pull up any country&rsquo;s 24-hour breakdown. From
            there it narrows: a thousand-dot simulation of a day unfolding, then a
            scrollytelling chart that follows one relationship at a time from age
            15 to 80 — and finally hands the data back to you to query and export.
          </p>
        </div>
      </section>

      {/* ── The discoveries ── */}
      <section className="mt-12">
        <Eyebrow tone="text-unpaid">The &ldquo;I had no idea&rdquo; moments</Eyebrow>
        <h2 className="display mt-1 text-3xl">What the data reveals</h2>
        <ul className="mt-4 space-y-3 text-[15px] leading-7 text-fg/90">
          <li className="rounded-xl border border-border bg-panel/50 p-4">
            <strong className="text-fg">We grow more alone with age.</strong> Hours
            spent alone rise across the entire lifespan — from under 4 a day at 15
            to around 8 by 80. Solitude, not decline, is the quiet arc of a life.
          </li>
          <li className="rounded-xl border border-border bg-panel/50 p-4">
            <strong className="text-fg">Friends fade first.</strong> Time with
            friends peaks in the teens and drops sharply after 20 — the steepest
            early decline of any relationship. Coworkers fill the gap through
            midlife, then vanish almost overnight at retirement.
          </li>
          <li className="rounded-xl border border-border bg-panel/50 p-4">
            <strong className="text-fg">A partner endures.</strong> As friends,
            coworkers and grown children recede, time with a partner grows steadily
            and, for many, becomes the main company of later life.
          </li>
          <li className="rounded-xl border border-border bg-panel/50 p-4">
            <strong className="text-fg">The average day, and the whole planet.</strong>{" "}
            Across 33 surveyed countries the typical day runs about{" "}
            <strong>6h 41m of work</strong> and <strong>4h 53m of leisure</strong>;
            zoom out and roughly <strong>362,000 babies are born</strong> and{" "}
            <strong>169,000 people die</strong> every single day, with life
            expectancy near 74 and self-reported happiness around 5.5 / 10.
          </li>
        </ul>
      </section>

      {/* ── How to explore ── */}
      <section className="mt-12">
        <Eyebrow tone="text-work">How to explore it</Eyebrow>
        <h2 className="display mt-1 text-3xl">Five ways in</h2>
        <ol className="mt-4 space-y-2.5 text-[15px] leading-7 text-fg/90">
          <li><strong className="text-fg">Spin the globe.</strong> Toggle <em>Realistic</em> (real-time day/night + city lights) and <em>Data</em> (recolour every country by a metric).</li>
          <li><strong className="text-fg">Click a country.</strong> Its full 24-hour radial clock and life numbers slide in, compared against the world average.</li>
          <li><strong className="text-fg">Watch a day unfold.</strong> The heartbeat simulation animates a thousand people moving through sleep, work, and leisure.</li>
          <li><strong className="text-fg">Scroll a lifetime.</strong> The companionship chart walks you through who we spend our hours with, one relationship at a time.</li>
          <li><strong className="text-fg">Ask &amp; export.</strong> Query the data in plain English — from the inline box or the movable floating chat — then filter, sort, and download any slice as CSV.</li>
        </ol>
      </section>

      {/* ── Data & methodology ── */}
      <section className="mt-14">
        <Eyebrow tone="text-leisure">Data &amp; methodology</Eyebrow>
        <h2 className="display mt-1 text-3xl">Every number is sourced</h2>
        <p className="mt-3 text-[15px] leading-7 text-fg/90">
          All data is public, free, and cited. Nothing is invented — where a
          figure is derived or illustrative, it&rsquo;s labelled as such in the piece
          and explained here.
        </p>

        <div className="mt-5 overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-panel/70 text-left text-[11px] uppercase tracking-wide text-fg-muted">
                <th className="px-3 py-2 font-semibold">Dataset</th>
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Link</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map(([name, src, href], i) => (
                <tr key={href} className={`border-t border-border/50 ${i % 2 ? "bg-white/[0.015]" : ""}`}>
                  <td className="px-3 py-2 text-fg">{name}</td>
                  <td className="px-3 py-2 text-fg-muted">{src}</td>
                  <td className="px-3 py-2">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline decoration-border underline-offset-2 hover:decoration-accent"
                    >
                      open ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="display mt-8 text-xl">Honest caveats</h3>
        <ul className="mt-3 space-y-2.5 text-[15px] leading-7 text-fg/90">
          <li>
            <strong className="text-fg">Coverage varies by metric.</strong> The
            work/leisure time-use survey covers <strong>33 countries</strong>;
            births, deaths, life expectancy and population span up to{" "}
            <strong>~237</strong>. Both panels state this explicitly so the two
            counts are never read as a contradiction.
          </li>
          <li>
            <strong className="text-fg">Work is derived.</strong> Daily work is
            estimated from annual working hours (÷ 250 workdays); the remaining
            hours are sleep &amp; personal time — measured leisure is from OECD/OWID.
          </li>
          <li>
            <strong className="text-fg">The heartbeat is illustrative.</strong>{" "}
            Daily totals are real, but the <em>time-of-day arrangement</em> is a
            typical-day template — per-hour data isn&rsquo;t collected for most
            countries, and the piece says so inline.
          </li>
          <li>
            <strong className="text-fg">Companionship is US-only.</strong> The
            lifetime chart uses the American Time Use Survey; categories can
            overlap (e.g. family time that is also childcare).
          </li>
          <li>
            <strong className="text-fg">Regions are a grouping, not a source.</strong>{" "}
            Countries are mapped to business regions (NA, LATAM, EU, MENA, APAC,
            SSA) for the table filter; the map covers all 237 countries with no
            gaps or duplicates.
          </li>
        </ul>
      </section>

      {/* ── Tools ── */}
      <section className="mt-14">
        <Eyebrow tone="text-work">Tools used</Eyebrow>
        <h2 className="display mt-1 text-3xl">How it&rsquo;s built</h2>
        <dl className="mt-4 divide-y divide-border/50 rounded-xl border border-border">
          {TOOLS.map(([name, what]) => (
            <div key={name} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
              <dt className="w-40 shrink-0 font-medium text-fg">{name}</dt>
              <dd className="text-[15px] leading-6 text-fg-muted">{what}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── GenAI documentation ── */}
      <section id="genai" className="mt-14 scroll-mt-8">
        <Eyebrow tone="text-accent-warm">Best Use of GenAI</Eyebrow>
        <h2 className="display mt-1 text-3xl">How AI was used</h2>
        <p className="mt-3 text-[15px] leading-7 text-fg/90">
          This entry was built by one person working with{" "}
          <strong>Claude (via Claude Code)</strong> as an AI pair-programmer. AI
          was part of the workflow end to end — but every fact remains traceable
          to a cited public dataset. Here is exactly where and how it helped.
        </p>

        <div className="mt-5 space-y-4 text-[15px] leading-7 text-fg/90">
          <div className="rounded-xl border border-border bg-panel/50 p-4">
            <p className="font-medium text-fg">1 · Data discovery &amp; cleaning</p>
            <p className="mt-1 text-fg-muted">
              Locating credible public datasets across OWID, OECD, FAO, the UN, BLS
              and Eurostat; reconciling country names to ISO3 codes; merging a
              dozen sources into typed, per-country records; and flagging coverage
              gaps (which drove the &ldquo;33 vs 237&rdquo; honesty note above).
            </p>
          </div>
          <div className="rounded-xl border border-border bg-panel/50 p-4">
            <p className="font-medium text-fg">2 · The region classification</p>
            <p className="mt-1 text-fg-muted">
              Generating and verifying the ISO3 → business-region map for all 237
              countries, then machine-checking it for missing or duplicate codes so
              the table filter is exhaustive and correct.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-panel/50 p-4">
            <p className="font-medium text-fg">3 · Code generation</p>
            <p className="mt-1 text-fg-muted">
              Implementing the three-globe day/night Earth, the D3 lifetime
              scrollytelling chart, the radial 24-hour clock, the heartbeat
              particle simulation, and the responsive layout — with AI writing,
              refactoring, and debugging alongside the author.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-panel/50 p-4">
            <p className="font-medium text-fg">4 · Narrative generation</p>
            <p className="mt-1 text-fg-muted">
              Designing a deterministic &ldquo;data story&rdquo; engine that composes each
              country&rsquo;s write-up from its real numbers versus the world average —
              so the prose is generated, but every sentence is backed by a figure,
              with no fabrication.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-panel/50 p-4">
            <p className="font-medium text-fg">5 · &ldquo;Ask the data&rdquo; — a live LLM router, computing from data</p>
            <p className="mt-1 text-fg-muted">
              Both the in-page <em>Ask the data</em> box and the floating chat
              use the same hybrid design. Every question is sent to a{" "}
              <strong>live language model</strong> running behind a small
              serverless router, which does <em>one</em> job — it maps your
              free-text phrasing to a <strong>structured query</strong> (which
              measure, highest/lowest, or a named country). The model never
              produces a figure, a fact, or a country of its own. A{" "}
              <strong>local, deterministic engine</strong> then computes the
              answer straight from the datasets, so every number stays sourced
              and reproducible — <em>the AI interprets, the data answers.</em> The
              router validates the model&rsquo;s output against a fixed list of
              metrics before trusting it, and if the model is ever slow or
              unavailable the box falls back to an on-device parser and still
              works — offline and all.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-panel/50 p-4">
            <p className="font-medium text-fg">6 · Accessibility &amp; review</p>
            <p className="mt-1 text-fg-muted">
              Adding ARIA labels and screen-reader summaries, honouring{" "}
              <code className="rounded bg-bg-soft px-1 text-[13px]">prefers-reduced-motion</code>,
              and iteratively critiquing the piece against the VizCon judging
              rubric to tighten the story and design.
            </p>
          </div>
        </div>
      </section>

      {/* ── Accessibility ── */}
      <section className="mt-14">
        <Eyebrow tone="text-leisure">Accessibility &amp; inclusivity</Eyebrow>
        <h2 className="display mt-1 text-3xl">Built for everyone</h2>
        <ul className="mt-4 space-y-2.5 text-[15px] leading-7 text-fg/90">
          <li><strong className="text-fg">Motion is optional.</strong> All animation — the globe, the heartbeat, transitions — respects the OS &ldquo;reduce motion&rdquo; setting.</li>
          <li><strong className="text-fg">The globe has a text alternative.</strong> Its live state is announced to screen readers, and the searchable, exportable data table is a full non-visual path to every number.</li>
          <li><strong className="text-fg">Colour-aware.</strong> The magma sequential ramp is perceptually uniform and legible for common colour-vision differences; dark and light themes both ship.</li>
          <li><strong className="text-fg">Labelled &amp; keyboard-friendly.</strong> Controls carry ARIA labels and visible focus rings; charts have legends and annotations.</li>
        </ul>
      </section>

      {/* ── Footer / credits ── */}
      <footer className="mt-16 border-t border-border/50 pt-8 text-sm text-fg-muted">
        <p>
          <strong className="text-fg">24 Hours on Earth</strong> · Analyticon VizCon 2026 ·
          solo entry, Daily Life theme.
        </p>
        <p className="mt-1">
          Built by{" "}
          <a
            href="https://atoz.amazon.work/phonetool/users/vnpras"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            @vnpras
          </a>{" "}
          with React, Next.js, D3, three-globe, and Claude.
        </p>
        <p className="mt-4">
          <Link href="/" className="text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            ← Back to the visualization
          </Link>
        </p>
      </footer>
    </main>
  );
}
