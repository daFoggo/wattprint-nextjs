import type { ExpectedHour } from "./schemas"

const HOUR = 3_600_000
const DAY = 24 * HOUR
const ICT = 7 * HOUR // Asia/Ho_Chi_Minh, no summer time

/** The usual draw (W) under each chart step: its hour's expected kWh; null when any step's hour is missing. */
export function usualWatts(
  steps: number[],
  hours: ExpectedHour[]
): number[] | null {
  const byHour = new Map(hours.map((h) => [h.ts, h.p50]))
  const out: number[] = []
  for (const ts of steps) {
    const kwh = byHour.get(Math.floor(ts / HOUR) * HOUR)
    if (kwh === undefined) return null
    out.push(kwh * 1000)
  }
  return out
}

/** Today's measured kWh (local day) against what the model expected for those same hours; null without any. */
export function todaySoFar(
  hours: ExpectedHour[],
  now: number
): { actual: number; expected: number } | null {
  const midnight = Math.floor((now + ICT) / DAY) * DAY - ICT
  const today = hours.filter(
    (h) => h.ts >= midnight && h.ts < now && h.kwh !== null
  )
  if (!today.length) return null
  const sum = (f: (h: ExpectedHour) => number) =>
    today.reduce((a, h) => a + f(h), 0)
  return { actual: sum((h) => h.kwh!), expected: sum((h) => h.p50) }
}
