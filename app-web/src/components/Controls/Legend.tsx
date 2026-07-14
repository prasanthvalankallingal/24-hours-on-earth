"use client";

import type { Metric } from "@/lib/types";
import { METRIC_BY_KEY } from "@/lib/types";
import { rampColor, OCEAN, NO_DATA } from "@/lib/colors";

export default function Legend({ metric }: { metric: Metric }) {
  const def = METRIC_BY_KEY[metric];
  const stops = Array.from({ length: 24 }, (_, i) => rampColor(i / 23));
  const gradient = `linear-gradient(to right, ${stops.join(",")})`;

  return (
    <div className="rounded-lg border border-border bg-panel/85 p-3 text-xs backdrop-blur">
      <div className="mb-1.5 font-medium text-fg">
        {def.label} <span className="text-fg-muted">{def.unit}</span>
      </div>
      <div className="h-2.5 w-44 rounded-full" style={{ background: gradient }} />
      <div className="mt-1 flex justify-between text-[10px] text-fg-muted">
        <span>lower</span>
        <span>higher</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-fg-muted">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: OCEAN }} />
        oceans
        <span
          className="ml-2 inline-block h-2.5 w-2.5 rounded-sm"
          style={{ background: NO_DATA }}
        />
        no data
      </div>
    </div>
  );
}
