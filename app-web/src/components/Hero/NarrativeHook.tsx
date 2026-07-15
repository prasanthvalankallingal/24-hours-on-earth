"use client";

import { useEffect, useMemo, useState } from "react";
import type { City, CountryMetrics, Metric } from "@/lib/types";
import { isDaylight, localHour } from "@/lib/solar";

interface Props {
  cities: City[];
  metric: Metric;
  metrics: CountryMetrics[];
}

const commas = (v: number) => Math.round(v).toLocaleString("en-US");

// A live, metric-aware "lean forward" line. Everything is computed from real
// time + city longitude (sun geometry / local clock) or from real per-day
// rates — nothing is a hard-claimed measurement of what people are literally
// doing. Phrasing is deliberately honest ("in darkness", "in local working
// hours", "in the last minute").
export function LiveSleepLine({ cities, metric, metrics }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // world daily totals for the births/deaths tickers
  const worldDaily = useMemo(() => {
    const births = metrics.reduce((a, b) => a + (b.dailyBirths ?? 0), 0);
    const deaths = metrics.reduce((a, b) => a + (b.dailyDeaths ?? 0), 0);
    return { births, deaths };
  }, [metrics]);

  const line = useMemo(() => {
    if (!now) return null;
    let total = 0;
    let dark = 0; // in local night
    let working = 0; // in local 9–17
    for (const c of cities) {
      total += c.pop;
      if (!isDaylight(c.lat, c.lng, now)) dark += c.pop;
      const h = localHour(c.lng, now);
      if (h >= 9 && h < 17) working += c.pop;
    }
    const pctDark = Math.round((dark / total) * 100);
    const pctWork = Math.round((working / total) * 100);

    // seconds elapsed since local midnight UTC-day start → for per-minute rate
    switch (metric) {
      case "work":
        return (
          <>
            Right now, about <Em>{pctWork}%</Em> of the world&apos;s biggest
            cities are in their local working hours (9am–5pm). Work fills the
            daylight side of the planet.
          </>
        );
      case "leisure":
        return (
          <>
            Leisure peaks in the evening. Right now roughly <Em>{pctDark}%</Em>{" "}
            of major cities are past sunset — winding down, or already asleep.
          </>
        );
      case "dailyBirths":
        return (
          <>
            Somewhere on Earth, about{" "}
            <Em>{commas(worldDaily.births / 1440)}</Em> babies are born every
            minute — roughly <Em>{commas(worldDaily.births)}</Em> today.
          </>
        );
      case "dailyDeaths":
        return (
          <>
            About <Em>{commas(worldDaily.deaths / 1440)}</Em> people die each
            minute worldwide — roughly <Em>{commas(worldDaily.deaths)}</Em>{" "}
            today.
          </>
        );
      case "calories":
      case "meat":
      case "vegetables":
        return (
          <>
            Right now it&apos;s a mealtime somewhere: on the daylit half of the
            planet — about <Em>{100 - pctDark}%</Em> of big cities — the day&apos;s
            eating is underway.
          </>
        );
      case "commute":
        return (
          <>
            Rush hour never ends globally. About <Em>{pctWork}%</Em> of major
            cities are inside working hours — bookended by the commute.
          </>
        );
      default:
        return (
          <>
            Right now, about <Em>{pctDark}%</Em> of the world&apos;s biggest
            cities are in darkness — most of them asleep. The line between day
            and night is the line between the world&apos;s sleepers and its
            workers.
          </>
        );
    }
  }, [now, metric, cities, worldDaily]);

  return (
    <p className="max-w-md text-sm leading-6 text-fg-muted/90">{line}</p>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-accent-2">{children}</span>;
}
