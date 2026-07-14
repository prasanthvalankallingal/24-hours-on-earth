// Shared data types for "24 Hours on Earth"

export interface CountryTimeUse {
  country: string;
  code: string;            // ISO3
  region: string | null;
  population: number;
  leisureWomenMin: number | null;
  leisureMenMin: number | null;
  leisureMin: number | null;
  workMin: number | null;  // derived from annual working hours
  workYear: number | null;
}

export interface WorkingHoursBroad {
  country: string;
  code: string;
  year: number;
  workMin: number;
}

export interface CompanionshipPoint {
  age: number;
  alone: number | null;
  friends: number | null;
  children: number | null;
  family: number | null;
  partner: number | null;
  coworkers: number | null;
}

export type CompanionshipData = Record<
  "All people" | "Men" | "Women",
  CompanionshipPoint[]
>;

export interface CountryMetrics {
  code: string;
  country: string;
  happiness?: number;
  birthRate?: number;
  deathRate?: number;
  lifeExpectancy?: number;
  fertility?: number;
  internet?: number;
  population?: number;
  dailyBirths?: number;
  dailyDeaths?: number;
  calories?: number;
  meat?: number;
  vegetables?: number;
  commute?: number;
  [key: string]: number | string | undefined;
}

export interface City {
  name: string;
  lat: number;
  lng: number;
  country: string;
  pop: number;
}

// Time-use metrics live on CountryTimeUse (33); global metrics on CountryMetrics (236).
export type Metric =
  | "leisure"
  | "work"
  | "dailyBirths"
  | "dailyDeaths"
  | "commute"
  | "calories"
  | "meat"
  | "vegetables"
  | "happiness"
  | "lifeExpectancy"
  | "fertility"
  | "internet";

export type Gender = "both" | "women" | "men";

/** "day" = happens within a 24h day; "eat" = what's eaten in a day; "life" = a state of a life. */
export type MetricGroup = "day" | "eat" | "life";

export interface MetricDef {
  key: Metric;
  label: string;
  short: string;
  unit: string;
  source: "timeuse" | "metrics";
  group: MetricGroup;
  /** true = higher is "warmer" on the ramp */
  higherIsMore: boolean;
  fmt: (v: number) => string;
  /** short 24h-context phrasing for the day group */
  daily?: (v: number) => string;
}

const hm = (v: number) => `${Math.floor(v / 60)}h ${Math.round(v % 60)}m`;
const commas = (v: number) => Math.round(v).toLocaleString("en-US");

export const METRICS: MetricDef[] = [
  // ── A DAY: things that happen within 24 hours ──
  { key: "leisure", label: "Leisure time", short: "Leisure", unit: "/day", source: "timeuse", group: "day", higherIsMore: true, fmt: hm, daily: (v) => `${hm(v)} of leisure` },
  { key: "work", label: "Work time", short: "Work", unit: "/day", source: "timeuse", group: "day", higherIsMore: true, fmt: hm, daily: (v) => `${hm(v)} working` },
  { key: "dailyBirths", label: "Babies born in a day (avg)", short: "Births/day", unit: "people", source: "metrics", group: "day", higherIsMore: true, fmt: commas, daily: (v) => `${commas(v)} babies born in an average day` },
  { key: "dailyDeaths", label: "People who die in a day (avg)", short: "Deaths/day", unit: "people", source: "metrics", group: "day", higherIsMore: true, fmt: commas, daily: (v) => `${commas(v)} die in an average day` },
  { key: "commute", label: "Commute per day (round-trip, EU)", short: "Commute", unit: "min/day", source: "metrics", group: "day", higherIsMore: true, fmt: hm },
  // ── WHAT THEY EAT: consumed in an average day ──
  { key: "calories", label: "Calorie supply per day", short: "Calories", unit: "kcal/day", source: "metrics", group: "eat", higherIsMore: true, fmt: (v) => `${commas(v)} kcal` },
  { key: "meat", label: "Meat eaten per day", short: "Meat", unit: "g/day", source: "metrics", group: "eat", higherIsMore: true, fmt: (v) => `${Math.round(v)} g` },
  { key: "vegetables", label: "Vegetables eaten per day", short: "Vegetables", unit: "g/day", source: "metrics", group: "eat", higherIsMore: true, fmt: (v) => `${Math.round(v)} g` },
  // ── A LIFE: states of a life, not daily events ──
  { key: "happiness", label: "Happiness (Cantril ladder)", short: "Happiness", unit: "/10", source: "metrics", group: "life", higherIsMore: true, fmt: (v) => v.toFixed(2) },
  { key: "lifeExpectancy", label: "Life expectancy", short: "Life exp.", unit: "yrs", source: "metrics", group: "life", higherIsMore: true, fmt: (v) => `${v.toFixed(1)} yrs` },
  { key: "fertility", label: "Children per woman", short: "Fertility", unit: "", source: "metrics", group: "life", higherIsMore: true, fmt: (v) => v.toFixed(2) },
  { key: "internet", label: "Internet use", short: "Internet", unit: "%", source: "metrics", group: "life", higherIsMore: true, fmt: (v) => `${v.toFixed(0)}%` },
];

export const METRIC_BY_KEY: Record<Metric, MetricDef> = Object.fromEntries(
  METRICS.map((m) => [m.key, m]),
) as Record<Metric, MetricDef>;

export const ACTIVITY_COLORS = {
  sleep: "#7c9cff",
  work: "#ff9f43",
  leisure: "#4fd1a1",
  unpaid: "#f56ea8",
  other: "#b0b8d0",
} as const;
