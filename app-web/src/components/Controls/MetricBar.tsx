"use client";

import type { Metric, Gender } from "@/lib/types";
import { METRICS } from "@/lib/types";
import type { GlobeMode } from "@/components/Globe/EarthGlobe";

interface Props {
  metric: Metric;
  gender: Gender;
  mode: GlobeMode;
  onMetric: (m: Metric) => void;
  onGender: (g: Gender) => void;
}

const chip =
  "px-2.5 py-1 text-xs rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-accent whitespace-nowrap";

// Headline globe layers cover a 24-hour day: how it's spent + what's eaten.
// "A life" indicators stay in the country panel as secondary context only.
const dayMetrics = METRICS.filter((m) => m.group === "day");
const eatMetrics = METRICS.filter((m) => m.group === "eat");

export default function MetricBar({ metric, gender, mode, onMetric, onGender }: Props) {
  const genderEnabled = metric === "leisure";
  const disabled = mode === "realistic";

  return (
    <div
      className={`flex max-w-[92vw] flex-col gap-2 rounded-xl border border-border bg-panel/85 p-3 backdrop-blur ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Group label="IN A DAY" accent="text-leisure">
          {dayMetrics.map((m) => (
            <MetricChip
              key={m.key}
              def={m}
              active={metric === m.key}
              disabled={disabled}
              onClick={() => onMetric(m.key)}
            />
          ))}
        </Group>

        <span className="h-8 w-px bg-border" aria-hidden />

        <Group label="WHAT THEY EAT" accent="text-work">
          {eatMetrics.map((m) => (
            <MetricChip
              key={m.key}
              def={m}
              active={metric === m.key}
              disabled={disabled}
              onClick={() => onMetric(m.key)}
            />
          ))}
        </Group>

        {genderEnabled && !disabled && (
          <>
            <span className="h-8 w-px bg-border" aria-hidden />
            <fieldset className="flex items-center gap-1" aria-label="Gender split">
              <legend className="sr-only">Gender</legend>
              {(["both", "women", "men"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => onGender(g)}
                  aria-pressed={gender === g}
                  className={`${chip} capitalize ${
                    gender === g ? "bg-accent text-white font-medium" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {g}
                </button>
              ))}
            </fieldset>
          </>
        )}
      </div>
    </div>
  );
}

function Group({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-1" aria-label={label}>
      <legend className={`text-[9px] font-semibold uppercase tracking-widest ${accent}`}>
        {label}
      </legend>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </fieldset>
  );
}

function MetricChip({
  def,
  active,
  disabled,
  onClick,
}: {
  def: (typeof METRICS)[number];
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={`${chip} ${
        active ? "bg-accent text-white font-medium" : "text-fg-muted hover:text-fg"
      } ${disabled ? "cursor-not-allowed" : ""}`}
    >
      {def.short}
    </button>
  );
}
