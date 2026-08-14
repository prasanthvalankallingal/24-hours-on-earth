// Client side of the "Ask the data" hybrid. Sends the free-text question to the
// language-router Worker and gets back a structured hint {metric, direction,
// country?} that ask() executes deterministically. The router only interprets
// the question — it never returns figures.
//
// Every failure path (no URL configured, network error, timeout, malformed
// response) resolves to null so the caller falls back to the local parser. The
// Ask box therefore works with or without the Worker.

import type { AskHint } from "./ask";
import type { Metric } from "./types";

const ROUTER_URL = process.env.NEXT_PUBLIC_ROUTER_URL || "";

const METRICS: Metric[] = [
  "leisure", "work", "dailyBirths", "dailyDeaths", "commute",
  "calories", "meat", "vegetables", "happiness", "lifeExpectancy",
  "fertility", "internet",
];
const DIRECTIONS = ["highest", "lowest", "lookup"] as const;

function isHint(x: unknown): x is AskHint {
  if (!x || typeof x !== "object") return false;
  const h = x as Record<string, unknown>;
  return (
    METRICS.includes(h.metric as Metric) &&
    DIRECTIONS.includes(h.direction as (typeof DIRECTIONS)[number]) &&
    (h.country === undefined || typeof h.country === "string")
  );
}

export async function route(question: string): Promise<AskHint | null> {
  if (!ROUTER_URL) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(ROUTER_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { hint?: unknown };
    return isHint(data?.hint) ? data.hint : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
