"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CountryTimeUse, CountryMetrics } from "@/lib/types";
import { METRICS } from "@/lib/types";
import RadialClock from "./RadialClock";

interface Props {
  country: CountryTimeUse | null;
  metrics: CountryMetrics | null;
  worldAvgLeisure: number | null;
  onClose: () => void;
  showClose?: boolean;
}

function hm(m: number | null | undefined) {
  if (m == null) return "—";
  return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
}

// Global metric keys we show in the panel, split by 24h context.
const DAY_METRICS = METRICS.filter((m) => m.source === "metrics" && m.group === "day");
const EAT_METRICS = METRICS.filter((m) => m.source === "metrics" && m.group === "eat");
const LIFE_METRICS = METRICS.filter((m) => m.source === "metrics" && m.group === "life");

export default function SidePanel({ country, metrics, worldAvgLeisure, onClose, showClose = true }: Props) {
  const open = Boolean(country || metrics);
  const name = country?.country ?? metrics?.country ?? "";
  const region = country?.region ?? null;
  const hasClock = country && (country.leisureMin != null || country.workMin != null);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key={country?.code ?? metrics?.code}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="pointer-events-auto max-h-[calc(100vh-16rem)] w-[360px] max-w-[90vw] overflow-y-auto rounded-2xl border border-border bg-panel/95 p-5 shadow-2xl backdrop-blur"
          role="dialog"
          aria-label={`Details for ${name}`}
        >
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{name}</h3>
              {region && <p className="text-xs text-fg-muted">{region}</p>}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="rounded-md px-2 py-1 text-fg-muted hover:bg-bg-soft hover:text-fg"
              >
                ✕
              </button>
            )}
          </div>

          {hasClock && country && (
            <>
              <RadialClock data={country} />
              <dl className="mt-4 space-y-1.5 text-sm">
                <Row label="Leisure (women)" value={hm(country.leisureWomenMin)} />
                <Row label="Leisure (men)" value={hm(country.leisureMenMin)} />
                <Row label="Work (derived)" value={hm(country.workMin)} hint={country.workYear ?? undefined} />
                {worldAvgLeisure != null && country.leisureMin != null && (
                  <Row
                    label="vs world leisure avg"
                    value={`${country.leisureMin >= worldAvgLeisure ? "+" : ""}${Math.round(
                      country.leisureMin - worldAvgLeisure,
                    )} min`}
                  />
                )}
              </dl>
            </>
          )}

          {metrics && (
            <>
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-leisure">
                  In a day
                </div>
                {DAY_METRICS.map((def) => {
                  const v = metrics[def.key];
                  if (typeof v !== "number") return null;
                  return <Row key={def.key} label={def.label} value={def.fmt(v)} />;
                })}
              </dl>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-work">
                  What they eat
                </div>
                {EAT_METRICS.map((def) => {
                  const v = metrics[def.key];
                  if (typeof v !== "number") return null;
                  return <Row key={def.key} label={def.label} value={def.fmt(v)} />;
                })}
              </dl>
              {/* Secondary context only — small chips, not a headline layer. */}
              <div className="mt-4 border-t border-border/50 pt-3">
                <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-fg-muted">
                  Context
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LIFE_METRICS.map((def) => {
                    const v = metrics[def.key];
                    if (typeof v !== "number") return null;
                    return (
                      <span
                        key={def.key}
                        className="rounded-md bg-bg-soft px-2 py-0.5 text-[11px] text-fg-muted"
                      >
                        {def.short}{" "}
                        <span className="font-medium text-fg">{def.fmt(v)}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!hasClock && !metrics && (
            <p className="py-8 text-center text-sm text-fg-muted">
              No survey data for this country.
            </p>
          )}

          {hasClock && (
            <p className="mt-3 text-[10px] leading-4 text-fg-muted">
              <span className="text-accent-warm">*</span> Work derived from annual
              working hours (÷250 workdays); sleep &amp; personal is the 24h
              remainder. Leisure measured (OECD/OWID).
            </p>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-1">
      <dt className="text-fg-muted">
        {label}
        {hint != null && <span className="ml-1 text-[10px] opacity-60">({hint})</span>}
      </dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
