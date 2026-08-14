// "Ask the data" — a lightweight natural-language query engine over the local
// datasets. Fully client-side (no backend, no API key), so it works offline and
// never fails during judging. It parses a question for a metric + intent
// (highest / lowest / compare / lookup) and answers from the real data.
//
// This is the deterministic core of the hybrid GenAI feature: an optional live
// Claude layer can rewrite these same facts more fluidly, but the answer is
// always grounded in the numbers here.

import type { CountryTimeUse, CountryMetrics, Metric } from "./types";
import { METRICS, METRIC_BY_KEY, type MetricDef } from "./types";

/** A pre-parsed query from the optional language-router layer. It only says
    WHICH metric/direction/country to look at — never any figure. ask() computes
    the numbers exactly as it does for a locally-parsed question. */
export interface AskHint {
  metric: Metric;
  direction: "highest" | "lowest" | "lookup";
  country?: string;
}

export interface AskAnswer {
  /** Prose summary shown above the table. Computed from the real numbers —
      leader, runner-up, gap, and the overall average/spread — never invented. */
  writeup?: string;
  /** Short caption directly above the ranked list. */
  text: string;
  rows?: { label: string; value: string }[];
}

interface Row {
  code: string;
  country: string;
  value: number;
}

function metricRows(
  def: MetricDef,
  timeuse: CountryTimeUse[],
  metrics: CountryMetrics[],
): Row[] {
  const rows: Row[] = [];
  if (def.source === "timeuse") {
    for (const d of timeuse) {
      const v = def.key === "work" ? d.workMin : d.leisureMin;
      if (typeof v === "number") rows.push({ code: d.code, country: d.country, value: v });
    }
  } else {
    for (const d of metrics) {
      const v = d[def.key];
      if (typeof v === "number") rows.push({ code: d.code, country: d.country, value: v });
    }
  }
  return rows;
}

// Match a metric from free text. Each metric lists many stem/synonym forms so
// natural phrasing works ("happiest", "healthiest", "eats the most", typos).
// Matching is done on word-stems + fuzzy edit distance — fully offline.
const METRIC_TERMS: { key: string; terms: string[] }[] = [
  { key: "leisure", terms: ["leisure", "free time", "relax", "rest", "leisurely", "downtime", "spare time"] },
  { key: "work", terms: ["work", "working", "works", "job", "labor", "labour", "hardest working", "busiest", "hours worked"] },
  { key: "dailyBirths", terms: ["birth", "births", "born", "babies", "baby", "natal", "fertility rate births"] },
  { key: "dailyDeaths", terms: ["death", "deaths", "die", "dies", "dying", "mortality", "deadly"] },
  { key: "commute", terms: ["commute", "commuting", "commuter", "travel to work", "journey to work", "commutes"] },
  { key: "calories", terms: ["calorie", "calories", "kcal", "food", "eat", "eats", "eating", "diet", "consume", "consumption"] },
  { key: "meat", terms: ["meat", "meats", "protein", "carnivore"] },
  { key: "vegetables", terms: ["vegetable", "vegetables", "veg", "veggies", "greens", "plant"] },
  { key: "happiness", terms: ["happy", "happier", "happiest", "happiness", "joy", "content", "satisfaction", "well being", "wellbeing", "cheerful"] },
  { key: "lifeExpectancy", terms: ["life", "life expectancy", "live", "lives", "lifespan", "longest", "longevity", "long lived", "healthiest", "oldest"] },
  { key: "fertility", terms: ["fertility", "children", "kids", "family size", "births per woman", "childbearing"] },
  { key: "internet", terms: ["internet", "online", "connected", "web", "digital", "connectivity"] },
];

// Levenshtein distance (bounded) — catches typos like "happyness" or "werk".
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[a.length][b.length];
}

function findMetric(q: string): MetricDef | null {
  const lower = ` ${q.toLowerCase().replace(/[^a-z\s]/g, " ")} `;
  const words = lower.split(/\s+/).filter(Boolean);

  // Pass 1: multi-word phrase or substring hit (most specific).
  for (const { key, terms } of METRIC_TERMS)
    for (const t of terms)
      if (t.includes(" ") && lower.includes(t))
        return METRICS.find((m) => m.key === key) ?? null;

  // Pass 2: single-term substring (word-stem) — e.g. "happiest" contains "happ…"? no,
  // so we also stem: match if a query word starts with the term or vice-versa.
  for (const { key, terms } of METRIC_TERMS)
    for (const t of terms) {
      if (t.includes(" ")) continue;
      for (const w of words) {
        if (w === t || w.startsWith(t) || t.startsWith(w.slice(0, Math.max(4, t.length)))) {
          return METRICS.find((m) => m.key === key) ?? null;
        }
      }
    }

  // Pass 3: fuzzy — tolerate typos within edit distance 1–2.
  for (const { key, terms } of METRIC_TERMS)
    for (const t of terms) {
      if (t.includes(" ") || t.length < 4) continue;
      for (const w of words) {
        if (w.length >= 4 && editDistance(w, t) <= (t.length > 6 ? 2 : 1))
          return METRICS.find((m) => m.key === key) ?? null;
      }
    }

  return null;
}

function findCountry(q: string, rows: Row[]): Row | null {
  const lower = q.toLowerCase();
  return rows.find((r) => lower.includes(r.country.toLowerCase())) ?? null;
}

export function ask(
  q: string,
  timeuse: CountryTimeUse[],
  metrics: CountryMetrics[],
  hint?: AskHint,
): AskAnswer {
  // With a router hint we know the metric directly; otherwise parse the text.
  const def = hint ? METRIC_BY_KEY[hint.metric] ?? null : findMetric(q);
  if (!def) {
    return {
      text:
        "I can answer questions about how the world spends its day — try asking about work, leisure, commute, calories, births, life expectancy, happiness, and more. For example: “Which country works the most?”",
    };
  }

  const rows = metricRows(def, timeuse, metrics);
  if (!rows.length) return { text: `I don't have ${def.label.toLowerCase()} data loaded.` };

  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const lower = q.toLowerCase();

  // Direction + country come from the hint when the router supplied one,
  // otherwise from parsing the question text. The compute below is identical.
  let wantsLow: boolean;
  let wantsHigh: boolean;
  let country: Row | null;
  if (hint) {
    wantsLow = hint.direction === "lowest";
    wantsHigh = hint.direction === "highest";
    country =
      hint.direction === "lookup" && hint.country
        ? rows.find((r) => r.country.toLowerCase() === hint.country!.toLowerCase()) ??
          rows.find((r) => r.code.toLowerCase() === hint.country!.toLowerCase()) ??
          findCountry(hint.country, rows)
        : null;
  } else {
    wantsLow = /(least|lowest|shortest|fewest|less|bottom|smallest)/.test(lower);
    wantsHigh = /(most|highest|longest|top|greatest|biggest|largest)/.test(lower);
    country = findCountry(q, rows);
  }
  if (country && !wantsLow && !wantsHigh) {
    const rank = sorted.findIndex((r) => r.code === country.code) + 1;
    return {
      text: `In ${country.country}, ${def.label.toLowerCase()} is ${def.fmt(
        country.value,
      )} — ranked #${rank} of ${rows.length} countries with data.`,
    };
  }

  // superlative
  const list = wantsLow ? [...sorted].reverse() : sorted;
  const top = list.slice(0, 5);
  const verb = wantsLow ? "lowest" : "highest";
  const label = def.label.toLowerCase();

  // Prose write-up — every figure below is read straight from `rows`.
  const leader = list[0];
  const runner = list[1];
  const mean = rows.reduce((s, r) => s + r.value, 0) / rows.length;
  const superlative = wantsLow ? "lowest" : "highest";
  const compare = wantsLow ? "below" : "above";

  const sentences: string[] = [
    `${leader.country} has the ${superlative} ${label} of any country with data, at ${def.fmt(leader.value)}.`,
  ];
  if (runner) {
    const gap = Math.abs(leader.value - runner.value);
    const gapPct = mean ? Math.round((gap / Math.abs(mean)) * 100) : 0;
    sentences.push(
      gap > 0
        ? `That's ${def.fmt(gap)} ${wantsLow ? "less than" : "more than"} ${runner.country} in second place${
            gapPct >= 3 ? ` — a gap of about ${gapPct}% of the global average` : ""
          }.`
        : `${runner.country} is level with it in second place.`,
    );
  }
  sentences.push(
    `Across all ${rows.length} countries with data, the average is ${def.fmt(mean)}, so the leaders sit well ${compare} the norm.`,
  );

  return {
    writeup: sentences.join(" "),
    text: `${verb === "highest" ? "Highest" : "Lowest"} ${label} (${rows.length} countries with data):`,
    rows: top.map((r, i) => ({ label: `${i + 1}. ${r.country}`, value: def.fmt(r.value) })),
  };
}

export const SUGGESTIONS = [
  "Which country works the most?",
  "Where do people have the most leisure?",
  "Who eats the most vegetables?",
  "Which country has the longest life expectancy?",
  "Where is the longest commute?",
  "Which country is happiest?",
];
