import { describe, expect, it } from "vitest"

import { comparePeriods, monthBefore } from "../days"

const days = Array.from({ length: 16 }, (_, i) => ({
  date: `2026-11-${String(i + 1).padStart(2, "0")}`,
  value: i + 1,
}))

describe("comparePeriods", () => {
  it("pairs each of the newest runs with the run count runs earlier", () => {
    expect(comparePeriods(days, 7, 1)).toEqual([
      { first: "2026-11-10", last: "2026-11-16", current: 91, previous: 42 },
    ])
    expect(comparePeriods(days, 1, 2)).toEqual([
      { first: "2026-11-15", last: "2026-11-15", current: 15, previous: 13 },
      { first: "2026-11-16", last: "2026-11-16", current: 16, previous: 14 },
    ])
  })
  it("is null without enough days", () => {
    expect(comparePeriods(days, 7, 2)).toBeNull()
  })
})

describe("monthBefore", () => {
  it("steps back one month, across a year and onto a shorter month", () => {
    expect(monthBefore("2026-11-01")).toBe("2026-10-01")
    expect(monthBefore("2026-01-15")).toBe("2025-12-15")
    expect(monthBefore("2026-03-31")).toBe("2026-02-28")
  })
})
