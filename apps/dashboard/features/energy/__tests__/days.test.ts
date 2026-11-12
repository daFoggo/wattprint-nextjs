import { describe, expect, it } from "vitest"

import { comparePeriods } from "../days"

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
