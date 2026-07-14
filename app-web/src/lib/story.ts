// Data-driven narrative generator. Composes readable "data stories" from the
// real datasets — no fabrication: every sentence is backed by a number and,
// where it compares, by the computed world average / rank. This is the
// deterministic engine; a live LLM can later rewrite the same facts (hybrid).

import type { CountryTimeUse, CountryMetrics } from "./types";

export interface WorldStats {
  avgLeisureMin: number;
  avgWorkMin: number;
  worldDailyBirths: number;
  worldDailyDeaths: number;
  avgHappiness: number | null;
  avgLifeExp: number | null;
  countriesWithTimeUse: number;
  countriesWithMetrics: number;
}

const hm = (m: number) => `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
const commas = (v: number) => Math.round(v).toLocaleString("en-US");
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function computeWorldStats(
  timeuse: CountryTimeUse[],
  metrics: CountryMetrics[],
): WorldStats {
  const leisure = timeuse.map((d) => d.leisureMin).filter((v): v is number => v != null);
  const work = timeuse.map((d) => d.workMin).filter((v): v is number => v != null);
  const births = metrics.map((d) => d.dailyBirths).filter((v): v is number => v != null);
  const deaths = metrics.map((d) => d.dailyDeaths).filter((v): v is number => v != null);
  const happy = metrics.map((d) => d.happiness).filter((v): v is number => v != null);
  const life = metrics.map((d) => d.lifeExpectancy).filter((v): v is number => v != null);
  return {
    avgLeisureMin: avg(leisure),
    avgWorkMin: avg(work),
    worldDailyBirths: births.reduce((a, b) => a + b, 0),
    worldDailyDeaths: deaths.reduce((a, b) => a + b, 0),
    avgHappiness: happy.length ? avg(happy) : null,
    avgLifeExp: life.length ? avg(life) : null,
    countriesWithTimeUse: leisure.length,
    countriesWithMetrics: metrics.length,
  };
}

/** Percentile rank of value within a sorted list (0..1, higher = larger). */
function pct(value: number, all: number[]): number {
  if (!all.length) return 0.5;
  const below = all.filter((v) => v < value).length;
  return below / all.length;
}

export interface StoryParagraph {
  text: string;
}

/** The world's average day — shown by default. */
export function worldStory(w: WorldStats): StoryParagraph[] {
  return [
    {
      text: `On an average day, the typical person in a surveyed country spends about ${hm(
        w.avgWorkMin,
      )} working and ${hm(w.avgLeisureMin)} on leisure — the rest of the 24 hours goes to sleep, meals, and everything in between.`,
    },
    {
      text: `Zoom out to the whole planet and the numbers become staggering: roughly ${commas(
        w.worldDailyBirths,
      )} babies are born and about ${commas(
        w.worldDailyDeaths,
      )} people die every single day.`,
    },
    {
      text: `Life isn't lived the same everywhere. Average life expectancy runs near ${w.avgLifeExp?.toFixed(
        0,
      )} years, and self-reported happiness averages about ${w.avgHappiness?.toFixed(
        1,
      )} out of 10 — but both swing widely by country. Click any country to see how its day, and its life, compare.`,
    },
  ];
}

/** A specific country's data story, composed from its numbers vs the world. */
export function countryStory(
  code: string,
  timeuse: CountryTimeUse[],
  metrics: CountryMetrics[],
  w: WorldStats,
): { title: string; paragraphs: StoryParagraph[] } | null {
  const tu = timeuse.find((d) => d.code === code) ?? null;
  const m = metrics.find((d) => d.code === code) ?? null;
  if (!tu && !m) return null;

  const name = tu?.country ?? m?.country ?? "This country";
  const paras: StoryParagraph[] = [];

  // Paragraph 1 — the day (if we have time-use data).
  if (tu && (tu.leisureMin != null || tu.workMin != null)) {
    const allLeisure = timeuse.map((d) => d.leisureMin).filter((v): v is number => v != null);
    const bits: string[] = [];
    if (tu.workMin != null) {
      const rel = tu.workMin - w.avgWorkMin;
      bits.push(
        `works about ${hm(tu.workMin)} a day (${
          Math.abs(rel) < 15 ? "close to" : rel > 0 ? `${hm(Math.abs(rel))} more than` : `${hm(Math.abs(rel))} less than`
        } the world average)`,
      );
    }
    if (tu.leisureMin != null) {
      const p = pct(tu.leisureMin, allLeisure);
      const rank =
        p > 0.75 ? "among the most leisurely" : p < 0.25 ? "among the least leisurely" : "middle-of-the-pack for leisure";
      bits.push(`enjoys ${hm(tu.leisureMin)} of leisure — ${rank} of surveyed nations`);
    }
    paras.push({ text: `In ${name}, the average person ${bits.join(", and ")}.` });

    // Gender gap, if present.
    if (tu.leisureMenMin != null && tu.leisureWomenMin != null) {
      const gap = tu.leisureMenMin - tu.leisureWomenMin;
      if (Math.abs(gap) >= 10) {
        paras.push({
          text: `There's a leisure gap between the sexes: men get about ${hm(
            Math.abs(gap),
          )} ${gap > 0 ? "more" : "less"} free time per day than women.`,
        });
      }
    }
  }

  // Paragraph 2 — daily births/deaths.
  if (m && (m.dailyBirths != null || m.dailyDeaths != null)) {
    const parts: string[] = [];
    if (m.dailyBirths != null) parts.push(`${commas(m.dailyBirths)} babies are born`);
    if (m.dailyDeaths != null) parts.push(`${commas(m.dailyDeaths)} people die`);
    paras.push({
      text: `Every day here, roughly ${parts.join(" and ")}${
        m.population ? `, among a population of ${commas(m.population / 1e6)} million` : ""
      }.`,
    });
  }

  // Paragraph 3 — life context.
  if (m) {
    const ctx: string[] = [];
    if (m.lifeExpectancy != null)
      ctx.push(
        `people live to about ${m.lifeExpectancy.toFixed(0)}${
          w.avgLifeExp ? ` (world avg ${w.avgLifeExp.toFixed(0)})` : ""
        }`,
      );
    if (m.happiness != null)
      ctx.push(`rate their happiness ${m.happiness.toFixed(1)}/10`);
    if (m.internet != null) ctx.push(`${m.internet.toFixed(0)}% are online`);
    if (ctx.length) paras.push({ text: `Over a lifetime, ${ctx.join(", ")}.` });
  }

  return { title: name, paragraphs: paras };
}
