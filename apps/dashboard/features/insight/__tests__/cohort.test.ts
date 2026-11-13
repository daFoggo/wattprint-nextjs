import { describe, expect, it } from "vitest"

import { shareBelow } from "../cohort"

const cohort = { homes: 35, days: 30, p10: 130, p33: 187, p66: 274, p90: 403 }

describe("shareBelow", () => {
  it("is the percentile at each published point", () => {
    expect(shareBelow(130, cohort)).toBeCloseTo(0.1)
    expect(shareBelow(274, cohort)).toBeCloseTo(0.66)
    expect(shareBelow(403, cohort)).toBeCloseTo(0.9)
  })

  it("reads between points in a straight line", () => {
    expect(shareBelow((274 + 403) / 2, cohort)).toBeCloseTo(0.78)
  })

  it("stays within 0 and 1", () => {
    expect(shareBelow(10, cohort)).toBe(0)
    expect(shareBelow(5000, cohort)).toBe(1)
  })
})
