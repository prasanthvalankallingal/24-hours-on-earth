// Illustrative daily-rhythm model for the "24-hour heartbeat" simulation.
//
// HONEST NOTE: the per-activity DAILY TOTALS (work, leisure, sleep & personal)
// come from real data (OECD/OWID time use). The ARRANGEMENT across the clock —
// when in the day each activity happens — is an illustrative "typical day"
// template, because per-hour time-of-day data does not exist for most
// countries. The simulation is labelled as illustrative in the UI.

export type Activity = "sleep" | "work" | "leisure" | "other";

export const ACTIVITIES: Activity[] = ["sleep", "work", "leisure", "other"];

export const ACTIVITY_META: Record<
  Activity,
  { label: string; color: string }
> = {
  sleep: { label: "Sleep & personal", color: "#7c9cff" },
  work: { label: "Work", color: "#ff9f43" },
  leisure: { label: "Leisure", color: "#4fd1a1" },
  other: { label: "Meals, chores, commute", color: "#b0b8d0" },
};

// Propensity shapes (0..1) by hour 0..23 — the "typical day" template.
const SHAPE: Record<Activity, number[]> = {
  // asleep overnight, dip through the day
  sleep: [1, 1, 1, 1, 1, 1, 0.9, 0.5, 0.15, 0.05, 0.03, 0.03, 0.05, 0.03, 0.03, 0.03, 0.03, 0.05, 0.08, 0.12, 0.2, 0.4, 0.7, 0.95],
  // work concentrated 9–17 with a lunch dip
  work: [0, 0, 0, 0, 0, 0.02, 0.05, 0.2, 0.6, 0.95, 1, 1, 0.7, 0.9, 1, 1, 0.95, 0.7, 0.3, 0.12, 0.05, 0.02, 0, 0],
  // leisure mostly evenings, a little midday
  leisure: [0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.05, 0.1, 0.15, 0.15, 0.2, 0.25, 0.35, 0.3, 0.3, 0.35, 0.45, 0.7, 0.9, 1, 1, 0.9, 0.6, 0.2],
  // meals / chores / commute — morning, noon, evening bumps
  other: [0.05, 0.05, 0.05, 0.05, 0.08, 0.15, 0.3, 0.5, 0.5, 0.35, 0.3, 0.35, 0.6, 0.5, 0.35, 0.35, 0.45, 0.55, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
};

export interface DayTotals {
  sleepMin: number;
  workMin: number;
  leisureMin: number;
  otherMin: number;
}

/** Split a country's 24h into the four buckets from measured leisure + derived
 *  work; sleep & personal + other make up the remainder (split by convention). */
export function dayTotals(
  workMin: number | null,
  leisureMin: number | null,
): DayTotals {
  const work = workMin ?? 0;
  const leisure = leisureMin ?? 0;
  const remainder = Math.max(0, 1440 - work - leisure);
  // Of the remainder, treat ~78% as sleep & personal, ~22% as meals/chores.
  const sleep = Math.round(remainder * 0.78);
  const other = remainder - sleep;
  return { sleepMin: sleep, workMin: work, leisureMin: leisure, otherMin: other };
}

/** Fraction of people in each activity at a given (continuous) hour 0..24. */
export function fractionsAtHour(t: number, totals: DayTotals): Record<Activity, number> {
  const h0 = Math.floor(t) % 24;
  const h1 = (h0 + 1) % 24;
  const f = t - Math.floor(t);
  const share: Record<Activity, number> = {
    sleep: totals.sleepMin / 1440,
    work: totals.workMin / 1440,
    leisure: totals.leisureMin / 1440,
    other: totals.otherMin / 1440,
  };
  const raw: Record<Activity, number> = { sleep: 0, work: 0, leisure: 0, other: 0 };
  let sum = 0;
  for (const a of ACTIVITIES) {
    const shape = SHAPE[a][h0] * (1 - f) + SHAPE[a][h1] * f;
    raw[a] = shape * share[a];
    sum += raw[a];
  }
  const out: Record<Activity, number> = { sleep: 0, work: 0, leisure: 0, other: 0 };
  for (const a of ACTIVITIES) out[a] = sum > 0 ? raw[a] / sum : share[a];
  return out;
}

export function fmtClock(t: number): string {
  const h = Math.floor(t) % 24;
  const m = Math.floor((t - Math.floor(t)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
