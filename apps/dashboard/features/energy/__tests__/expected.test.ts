import { describe, expect, it } from "vitest"

import { todaySoFar, usualWatts } from "../expected"
import { ExpectedHourSchema } from "../schemas"

const H = (iso: string) => Date.parse(iso)

describe("expected hours", () => {
  it("parse to ms with the measured kWh or null", () => {
    const h = ExpectedHourSchema.parse({
      ts: "2026-11-21T03:00:00Z",
      p10: 0.4,
      p50: 0.9,
      p90: 1.6,
      kwh: null,
    })
    expect(h.ts).toBe(H("2026-11-21T03:00:00Z"))
    expect(h.kwh).toBeNull()
  })

  it("draw the usual as watts under each chart step, or nothing when an hour is missing", () => {
    const hours = [
      { ts: H("2026-11-21T03:00:00Z"), p10: 0, p50: 0.9, p90: 0, kwh: null },
      { ts: H("2026-11-21T04:00:00Z"), p10: 0, p50: 1.2, p90: 0, kwh: null },
    ]
    const steps = [
      H("2026-11-21T03:00:00Z"),
      H("2026-11-21T03:45:00Z"),
      H("2026-11-21T04:15:00Z"),
    ]
    expect(usualWatts(steps, hours)).toEqual([900, 900, 1200])
    expect(usualWatts([H("2026-11-21T05:00:00Z")], hours)).toBeNull()
  })

  it("sum today's measured hours against what was expected for them", () => {
    const hours = [
      { ts: H("2026-11-20T16:00:00Z"), p10: 0, p50: 5, p90: 0, kwh: 9 }, // yesterday in Hanoi
      { ts: H("2026-11-20T17:00:00Z"), p10: 0, p50: 1, p90: 0, kwh: 1.5 },
      { ts: H("2026-11-20T18:00:00Z"), p10: 0, p50: 1, p90: 0, kwh: 0.5 },
      { ts: H("2026-11-20T19:00:00Z"), p10: 0, p50: 1, p90: 0, kwh: null }, // not measured
    ]
    expect(todaySoFar(hours, H("2026-11-20T20:10:00Z"))).toEqual({
      actual: 2,
      expected: 2,
    })
    expect(todaySoFar([], H("2026-11-20T20:10:00Z"))).toBeNull()
  })
})
