// Client side of the "Ask the data" hybrid. Sends the free-text question to the
// language-router Worker and gets back a structured hint {metric, direction,
// country?} that ask() executes deterministically. The router only interprets
// the question — it never returns figures.
//
// route() returns a discriminated result so the caller can tell three cases
// apart:
//   • "hint"        — the router mapped the question to a metric/direction/country.
//   • "composition" — a whole-day / time-of-day question ("what do people do all
//                     day", "…at night"). The caller shows the honest average-day
//                     breakdown (averageDay()) instead of a single-measure answer.
//   • "decline"     — the router was reachable but returned neither a hint nor a
//                     composition intent (genuinely off-topic / a trend over time).
//                     The caller shows guidance and MUST NOT fall back to the local
//                     parser (which could mis-match the phrasing).
//   • "fallback"    — no URL configured, network error, timeout, or a server error.
//                     The caller parses the text locally, so the box still works.

import type { AskHint } from "./ask";
import type { Metric } from "./types";

export type RouteResult =
  | { kind: "hint"; hint: AskHint }
  | { kind: "composition" }
  | { kind: "decline" }
  | { kind: "fallback" };

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

export async function route(question: string): Promise<RouteResult> {
  // No router configured (e.g. a build without the URL) → parse locally.
  if (!ROUTER_URL) return { kind: "fallback" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(ROUTER_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    // A server error means the router is effectively unavailable → local parse.
    if (!res.ok) return { kind: "fallback" };
    const data = (await res.json()) as { hint?: unknown; intent?: unknown };
    if (isHint(data?.hint)) return { kind: "hint", hint: data.hint };
    // The router recognised a whole-day / time-of-day question the ranking
    // engine can't answer, but the average-day breakdown can.
    if (data?.intent === "average_day") return { kind: "composition" };
    // Reachable but no usable hint = a deliberate decline. Respect it — do not
    // fall back to the local parser, which could mis-match the phrasing.
    return { kind: "decline" };
  } catch {
    // Network error or timeout → the box still answers via the local parser.
    return { kind: "fallback" };
  } finally {
    clearTimeout(timer);
  }
}
