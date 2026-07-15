"use client";

import { useEffect, useState } from "react";
import type { City } from "@/lib/types";
import { isDaylight } from "@/lib/solar";

interface Props {
  cities: City[];
}

// The "lean forward" opening line. Computes — from real solar geometry over the
// 1,200 largest cities (~1.9B people) — how many are in darkness RIGHT NOW.
// Honest sample, live, and provokes the whole premise: the day/night line is
// the line between the world's sleepers and its workers.
export function LiveSleepLine({ cities }: Props) {
  const [pct, setPct] = useState<number | null>(null);

  useEffect(() => {
    const compute = () => {
      const now = new Date();
      let asleep = 0;
      let total = 0;
      for (const c of cities) {
        total += c.pop;
        if (!isDaylight(c.lat, c.lng, now)) asleep += c.pop;
      }
      setPct(total ? Math.round((asleep / total) * 100) : null);
    };
    compute();
    const id = setInterval(compute, 60000); // refresh each minute
    return () => clearInterval(id);
  }, [cities]);

  return (
    <p className="max-w-md text-sm leading-6 text-fg-muted/90">
      Right now, about{" "}
      <span className="font-semibold text-accent-2">{pct ?? "—"}%</span> of the
      world&apos;s biggest cities are in darkness — most of them asleep. The line
      between day and night is the line between the world&apos;s sleepers and its
      workers.
    </p>
  );
}
