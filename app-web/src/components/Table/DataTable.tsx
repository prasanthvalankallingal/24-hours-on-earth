"use client";

import { useMemo, useState } from "react";
import type { CountryTimeUse, CountryMetrics, Metric } from "@/lib/types";
import { METRICS, METRIC_BY_KEY } from "@/lib/types";
import { rampColor } from "@/lib/colors";
import {
  regionFor,
  REGION_ORDER,
  REGION_SHORT,
  type Region,
} from "@/lib/regions";

// One tidy (long-format) row: a single country's value for a single metric.
interface Row {
  region: Region;
  code: string;
  country: string;
  metric: Metric;
  metricLabel: string;
  unit: string;
  value: number;      // raw numeric — used for sorting + CSV
  display: string;    // human-formatted value (e.g. "6h 27m")
  t: number;          // 0..1 position within this metric's range → bar + colour
}

type SortKey = "region" | "country" | "metric" | "value";
type MetricFilter = Metric | "all";

// Rendering thousands of <tr> is needless; the CSV export always covers the
// full filtered set, so we only paint the top slice on screen.
const MAX_VISIBLE = 500;

// Subtle per-region tint for the badge (kept off the blue/water hues).
const REGION_TINT: Record<Region, string> = {
  "North America": "#6ea8ff",
  "Latin America": "#4fd1a1",
  Europe: "#b98cff",
  MENA: "#ff9f43",
  APAC: "#f56ea8",
  "Sub-Saharan Africa": "#ffd98a",
};

function csvCell(v: string | number): string {
  const s = String(v);
  // Quote anything that could break a CSV field; double up embedded quotes.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function DataTable({
  timeuse,
  metrics,
}: {
  timeuse: CountryTimeUse[];
  metrics: CountryMetrics[];
}) {
  const [regions, setRegions] = useState<Set<Region>>(
    () => new Set(REGION_ORDER),
  );
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("work");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "value",
    dir: "desc",
  });

  // Build every (country, metric) value once. leisure/work come from the
  // time-use dataset (33 countries); the rest from the global metrics set (237).
  const allRows = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    // Track each metric's min/max so we can normalise the value bar per metric.
    const range: Partial<Record<Metric, { lo: number; hi: number }>> = {};
    const push = (
      metric: Metric,
      code: string,
      country: string,
      value: number | null | undefined,
    ) => {
      if (typeof value !== "number" || Number.isNaN(value)) return;
      const region = regionFor(code);
      if (!region) return;
      const def = METRIC_BY_KEY[metric];
      rows.push({
        region,
        code,
        country,
        metric,
        metricLabel: def.short,
        unit: def.unit,
        value,
        display: def.fmt(value),
        t: 0,
      });
      const r = range[metric] ?? { lo: value, hi: value };
      r.lo = Math.min(r.lo, value);
      r.hi = Math.max(r.hi, value);
      range[metric] = r;
    };

    for (const m of METRICS) {
      if (m.source === "timeuse") {
        for (const d of timeuse) {
          const v = m.key === "leisure" ? d.leisureMin : d.workMin;
          push(m.key, d.code, d.country, v);
        }
      } else {
        for (const d of metrics) {
          push(m.key, d.code, d.country, d[m.key] as number | undefined);
        }
      }
    }
    // Second pass: fill the normalised position now that ranges are known.
    for (const row of rows) {
      const r = range[row.metric]!;
      row.t = r.hi > r.lo ? (row.value - r.lo) / (r.hi - r.lo) : 0.5;
    }
    return rows;
  }, [timeuse, metrics]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = allRows.filter(
      (r) =>
        regions.has(r.region) &&
        (metricFilter === "all" || r.metric === metricFilter) &&
        (!q ||
          r.country.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q)),
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sort.key) {
        case "region":
          return (
            (REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region)) *
              dir || a.country.localeCompare(b.country)
          );
        case "country":
          return a.country.localeCompare(b.country) * dir;
        case "metric":
          return (
            a.metricLabel.localeCompare(b.metricLabel) * dir ||
            a.country.localeCompare(b.country)
          );
        case "value":
        default:
          return (a.value - b.value) * dir;
      }
    });
    return rows;
  }, [allRows, regions, metricFilter, query, sort]);

  const visible = filtered.slice(0, MAX_VISIBLE);

  function toggleRegion(r: Region) {
    setRegions((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      // Never allow an empty selection (that would blank the table).
      return next.size ? next : prev;
    });
  }

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "value" ? "desc" : "asc" },
    );
  }

  function exportCsv() {
    const header = [
      "Region",
      "Region code",
      "Country",
      "ISO3",
      "Metric",
      "Unit",
      "Value",
    ];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          csvCell(r.region),
          csvCell(REGION_SHORT[r.region]),
          csvCell(r.country),
          csvCell(r.code),
          csvCell(r.metricLabel),
          csvCell(r.unit),
          csvCell(r.value),
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `24-hours-on-earth_${metricFilter}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const arrow = (key: SortKey) =>
    sort.key === key ? (sort.dir === "asc" ? "▲" : "▼") : "";

  return (
    <div className="rounded-2xl border border-border bg-panel/70 p-4 backdrop-blur md:p-6">
      {/* ── Filter bar ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
            Region
          </span>
          {REGION_ORDER.map((r) => {
            const on = regions.has(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleRegion(r)}
                aria-pressed={on}
                title={r}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  on
                    ? "border-transparent text-white"
                    : "border-border text-fg-muted hover:text-fg"
                }`}
                style={on ? { background: REGION_TINT[r] } : undefined}
              >
                {REGION_SHORT[r]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-fg-muted">
            <span className="font-semibold uppercase tracking-widest text-[10px]">
              Metric
            </span>
            <select
              value={metricFilter}
              onChange={(e) => setMetricFilter(e.target.value as MetricFilter)}
              className="rounded-lg border border-border bg-panel px-2.5 py-1.5 text-sm text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="all">All metrics</option>
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country…"
            className="min-w-[10rem] flex-1 rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-accent"
          />

          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span aria-hidden>⤓</span> Export CSV
          </button>
        </div>

        <p className="text-[10px] text-fg-muted">
          {filtered.length.toLocaleString("en-US")} row
          {filtered.length === 1 ? "" : "s"}
          {filtered.length > MAX_VISIBLE && (
            <> · showing first {MAX_VISIBLE.toLocaleString("en-US")} — export CSV for all</>
          )}
        </p>
      </div>

      {/* ── Table ── */}
      <div className="mt-4 max-h-[28rem] overflow-auto rounded-xl border border-border/60">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-panel/95 backdrop-blur">
            <tr className="text-left text-[11px] uppercase tracking-wide text-fg-muted">
              {(
                [
                  ["region", "Region"],
                  ["country", "Country"],
                  ["metric", "Metric"],
                  ["value", "Value"],
                ] as [SortKey, string][]
              ).map(([key, label], i) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`cursor-pointer select-none border-b border-border px-3 py-2 font-semibold hover:text-fg ${
                    key === "value" ? "text-right" : ""
                  } ${i === 0 ? "w-24" : ""}`}
                >
                  {label} <span className="text-accent">{arrow(key)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr
                key={`${r.code}-${r.metric}`}
                className={`border-b border-border/40 ${
                  i % 2 ? "bg-white/[0.015]" : ""
                }`}
              >
                <td className="px-3 py-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs text-fg-muted"
                    title={r.region}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: REGION_TINT[r.region] }}
                    />
                    {REGION_SHORT[r.region]}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-fg">
                  {r.country}{" "}
                  <span className="text-[10px] text-fg-muted">{r.code}</span>
                </td>
                <td className="px-3 py-1.5 text-fg-muted">
                  {r.metricLabel}
                  {r.unit && (
                    <span className="ml-1 text-[10px] opacity-70">{r.unit}</span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${Math.max(4, r.t * 56)}px`,
                        background: rampColor(r.t),
                      }}
                      aria-hidden
                    />
                    <span className="w-24 text-right font-mono text-xs text-fg">
                      {r.display}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-fg-muted">
                  No rows match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
