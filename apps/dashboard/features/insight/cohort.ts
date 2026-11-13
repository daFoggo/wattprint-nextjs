import type { Cohort } from "./schemas"

/**
 * The share of similar homes that use less than `kwh` (0..1), read between the cohort's percentiles in a
 * straight line, with 0 and 1 beyond 5% under the 10th and 5% over the 90th.
 */
export function shareBelow(kwh: number, c: Cohort) {
  const points: [number, number][] = [
    [c.p10 * 0.5, 0],
    [c.p10, 0.1],
    [c.p33, 0.33],
    [c.p66, 0.66],
    [c.p90, 0.9],
    [c.p90 * 1.5, 1],
  ]
  if (kwh <= points[0]![0]) return 0
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!
    const [x0, y0] = points[i - 1]!
    if (kwh <= x1) return y0 + ((kwh - x0) / (x1 - x0)) * (y1 - y0)
  }
  return 1
}

/** The median, between the 33rd and 66th percentiles. */
export const median = (c: Cohort) => (c.p33 + c.p66) / 2
