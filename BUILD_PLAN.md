# VizCon 2026 — Build Plan

**Project:** "24 Hours on Earth" — How the world sleeps, works, and lives
**Theme:** How the world lives, thrives, and connects (Daily Life track)
**Deadline:** Submission **Fri, Aug 10, 2026** · Registration closes **Fri, Jul 17** · Finalists notified **Aug 21**
**Contest:** https://w.amazon.com/bin/view/Analyticon/2026/VizContest

---

## 1. The Concept

A cinematic, interactive web dashboard where a rotatable 3D globe with a live day/night
terminator is the entry point. Users toggle metrics to recolor the globe, click a country
to zoom in and see its 24-hour breakdown as an animated radial clock, then scroll into a
"24-hour heartbeat" agent simulation and a US lifetime-companionship story, with an
"Ask the data" query box at the end.

**One-line hook:** "Right now, ~1.9 billion people are asleep and ~1.2 billion are working.
The line between day and night is the line between the world's sleepers and its workers."

---

## 2. How this maps to judging criteria

| Criterion | Weight | How we win it |
|---|---|---|
| Data Storytelling & Impact | 30% | Narrative arc: a single day → a lifetime. Scrollytelling with one idea per beat. |
| Discovery & Innovation | 25% | Agent-based "day in the life" simulation + the day/night sleepers-vs-workers reveal. |
| Visual Design & Aesthetics | 20% | 3D globe, radial clocks, cohesive night-sky design system, purposeful color. |
| Data Quality & Inclusivity | 15% | All sources public + cited; honest "no data" states; alt text, contrast, reduced-motion. |
| Technical Execution & Engagement | 10% | Filters, click-to-zoom, compare mode, play controls, guided data chat. |

---

## 3. Verified Data (all public, downloadable, cited)

| Dataset | Coverage | Fields | Role |
|---|---|---|---|
| Leisure minutes/day (OWID/OECD) | 33 countries, 2020 | women's/men's leisure min, population, region | Hero drill-down |
| Annual working hours (OWID) | 130 countries, →2023 | hours/worker/yr → derived daily | Broadest globe recolor layer |
| Unpaid care & domestic work (OWID) | 47 countries | rural/urban × women/men | Gender-gap beat |
| Who Americans spend time with, by age (OWID/ATUS) | US only | alone/friends/family/partner/coworkers by age | US lifetime story |
| World Bank WDI (API) | ~265 entities, CC-BY | life expectancy, internet %, urban %, mobile subs | Whole-globe context layers |
| Day/night terminator | all 195 (computed) | sun subsolar point | Globe base layer |

**Data reality (design-driving):** rich per-country daily data ≈ 33 countries; working hours ≈ 130;
the rest show day/night + "no survey data" (honest, not fabricated).

**Sources to cite in submission:**
- OECD Time Use Database via Our World in Data — https://ourworldindata.org/time-use (CC-BY)
- American Time Use Survey — https://www.bls.gov/tus/data.htm (public, US gov)
- World Bank World Development Indicators — https://data.worldbank.org (CC-BY 4.0)
- Country boundaries — Natural Earth (public domain)

---

## 4. Tech Stack

- **Framework:** Next.js (React, TypeScript), static export
- **Styling:** Tailwind CSS + custom design tokens
- **Globe:** react-globe.gl (Three.js/WebGL) + Natural Earth GeoJSON country polygons
- **Charts:** D3 (radial clock, custom), Recharts/visx (standard bars/lines)
- **Animation:** Framer Motion + react-scrollama (scrollytelling)
- **Simulation:** custom canvas/D3 agent (dot) simulation for "24-hour heartbeat"
- **Data chat:** guided natural-language query over local JSON (no live LLM dependency at judging;
  optional Claude API behind a flag). Documented as GenAI usage.
- **Deploy:** Vercel (free, public URL) — satisfies "publicly accessible" rule
- **Data pipeline:** Python (pandas) → clean CSVs into static JSON committed to repo

---

## 5. Page / Section Structure

```
app/
  layout.tsx            # design system, fonts, dark theme
  page.tsx              # single-scroll experience orchestrating sections
components/
  Hero/Globe.tsx        # 3D globe, day/night terminator, auto-rotate
  Controls/MetricBar.tsx# metric toggle, gender split, region filter, sort
  Country/RadialClock.tsx # animated 24h clock, D3 arcs
  Country/SidePanel.tsx # slides in on click; country insights + compare
  Heartbeat/Simulation.tsx # agent-based dot flow, play/pause/scrub
  Story/Companionship.tsx  # US lifetime "who we spend time with"
  Chat/AskTheData.tsx   # guided query box + suggestion chips
  ui/                   # shared tokens, legend, tooltip, alt-text helpers
data/
  timeuse.json          # cleaned per-country daily breakdown
  working_hours.json
  companionship_us.json
  worldbank_context.json
  countries.geojson
scripts/
  build_data.py         # pandas pipeline: CSV -> JSON
```

### Section flow (single scroll)
1. **Hero globe** — auto-spin, day/night terminator, tagline.
2. **Metric controls** — Sleep · Work · Leisure · Unpaid · Screen time; Women/Men/Both; region filter; sort. Recolors globe live.
3. **Country click** — globe rotates + zooms; side panel with radial 24h clock, vs-world, compare mode.
4. **24-hour heartbeat** — play button; ~1000 dots flow between activities as clock ticks (the showstopper).
5. **US lifetime story** — companionship-by-age scrollytelling ("the loneliness curve").
6. **Ask the data** — guided NL query box, suggestion chips, GenAI documented.
7. **Sources & method** — citations, accessibility notes, GenAI documentation for the award.

---

## 6. Milestone Timeline (today 2026-07-14 → deadline 2026-08-10)

| Week | Dates | Goal |
|---|---|---|
| 0 | Jul 14–17 | **Register** (form). Scaffold Next.js + Tailwind + data pipeline. Static globe rendering. |
| 1 | Jul 18–24 | Globe + day/night + metric controls recoloring live. Country click → zoom + side panel + radial clock. |
| 2 | Jul 25–31 | 24-hour heartbeat simulation. US companionship scrolly. Design-system polish. |
| 3 | Aug 1–7 | Ask-the-data box. Accessibility pass (contrast, alt text, reduced-motion, labels). Deploy to Vercel. |
| 4 | Aug 8–10 | Buffer: copy/story polish, cross-device test, GenAI write-up, **submit**. |

---

## 7. Accessibility checklist (Data Quality 15%)
- WCAG AA contrast on all text and chart marks
- Alt text / descriptions for globe and each chart
- `prefers-reduced-motion` → static fallbacks for globe spin & simulation
- Keyboard-navigable controls and country selection
- Colorblind-safe palette; never color alone to convey meaning
- Inclusive language throughout

---

## 7b. Scope discipline — DAILY LIFE focus (locked 2026-07-14)
Theme is "How the world lives, thrives, and connects" (5 angles); our chosen
angle/story is **Daily Life — how the world spends its 24 hours**. To keep the
Storytelling score (30%) tight:
- **Headline globe metrics = "IN A DAY" only:** Sleep, Work, Leisure, Unpaid,
  Births/day, Deaths/day.
- **"A life" indicators (happiness, life expectancy, fertility, internet) are
  NOT globe layers** — they appear only as small secondary "Context" chips in
  the country panel.
- **Do NOT add the City Happiness Index** (off-story, weaker dataset).
- Rule going forward: if a dataset isn't about *how a day is spent*, it's
  context at most — never a headline layer.

## 8. Decisions (locked 2026-07-14)
- [x] **Solo** entry
- [x] Chat box: **Hybrid** — guided NL query over local JSON by default; optional live Claude API behind a flag
- [x] Globe engine: **react-globe.gl (3D / WebGL)**
- [x] Name: **"24 Hours on Earth — How the world sleeps, works, and lives"**
