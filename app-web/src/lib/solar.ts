// Day/night terminator math — computes the sub-solar point (where the sun is
// directly overhead) for a given time. Used to draw the night hemisphere on
// the globe. This is real astronomy, not decoration — all values are derived.

/** Sub-solar latitude/longitude for a given Date (UTC). */
export function subSolarPoint(date: Date): { lat: number; lng: number } {
  const rad = Math.PI / 180;
  // Day of year
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayMs = date.getTime() - start;
  const dayOfYear = dayMs / 86400000;

  // Solar declination (Cooper's equation), degrees
  const decl = 23.44 * Math.sin(rad * (360 / 365) * (dayOfYear - 81));

  // Sub-solar longitude: sun is over the meridian where it's local solar noon.
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  const lng = -15 * (utcHours - 12); // 15°/hour, noon at 0° UTC meridian

  return { lat: decl, lng: ((lng + 540) % 360) - 180 };
}

/** True if a given lat/lng is currently in daylight. */
export function isDaylight(lat: number, lng: number, date: Date): boolean {
  const rad = Math.PI / 180;
  const s = subSolarPoint(date);
  // Angular distance from sub-solar point; < 90° = sun above horizon.
  const cosZenith =
    Math.sin(lat * rad) * Math.sin(s.lat * rad) +
    Math.cos(lat * rad) *
      Math.cos(s.lat * rad) *
      Math.cos((lng - s.lng) * rad);
  return cosZenith > 0;
}

/** Rough global headcount asleep vs awake, from the day/night split.
 *  Assumes people are asleep where it's local night (a documented simplification). */
export function sleepersVsWorkers(
  populatedPoints: { lat: number; lng: number; pop: number }[],
  date: Date,
): { asleep: number; awake: number } {
  let asleep = 0;
  let awake = 0;
  for (const p of populatedPoints) {
    if (isDaylight(p.lat, p.lng, date)) awake += p.pop;
    else asleep += p.pop;
  }
  return { asleep, awake };
}
