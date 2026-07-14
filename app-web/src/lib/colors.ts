// Water-safe data ramp. Blue is RESERVED for oceans/water, so the choropleth
// ramp deliberately avoids blue: it runs magma-style dark-purple → magenta →
// orange → yellow (perceptually uniform, colorblind-friendly, high contrast on
// a dark globe). Inspired by nullschool's use of perceptual scales.

// Ramp floor lifted off near-black so low-value countries stay clearly visible
// against the ocean-blue sea (blue is reserved for water, so the ramp is warm).
const MAGMA: [number, number, number][] = [
  [92, 54, 120], // muted violet (low) — visible, not black
  [140, 50, 120],
  [190, 55, 110],
  [224, 90, 74],
  [245, 135, 45],
  [250, 190, 100],
  [253, 240, 170], // warm pale yellow (high)
];

export function rampColor(t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (MAGMA.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = MAGMA[i];
  const b = MAGMA[Math.min(i + 1, MAGMA.length - 1)];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// Water / ocean color — a deep ocean blue. Blue is reserved for water.
export const OCEAN = "#14456f";
// Countries without data for the current metric — a neutral slate grey that is
// clearly land (distinct from both the ocean blue and the warm data ramp), so
// "no data" never reads as black sea.
export const NO_DATA = "#3a4256";

export const CITY_GLOW = "#ffd98a"; // warm city-lights amber
