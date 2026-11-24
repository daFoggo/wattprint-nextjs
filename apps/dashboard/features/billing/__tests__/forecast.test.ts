import { describe, expect, it } from "vitest"

import { bandPosition, changeSentence, cycleDay, tierPath } from "../forecast"
import { ForecastSchema, PastBillSchema } from "../schemas"

/** What every forecast carries besides its own figures (a weekday one: a point, no reasons). */
const WEEKDAY = {
  method: "weekday",
  model_version: "weekday-profile-v1",
  kwh_p10: 450.5,
  kwh_p50: 450.5,
  kwh_p90: 450.5,
  amount_p10: 1_234_567,
  amount_p90: 1_234_567,
  change: null,
  accuracy: null,
  simulated: [],
}

const CONTEXT = {
  period_start: "2026-11-01",
  period_end: "2026-11-30",
  kwh: 210,
  amount: 650_000,
  tier_no: 4,
  next: {
    tier_no: 4,
    from_kwh: 201,
    price_per_kwh: 2900,
    on: "2026-11-26",
    probability: 0.7,
  },
  basis_days: 200,
  as_of: "2026-11-21",
  method: "context",
  model_version: "ctx-v1-202611210300",
  kwh_p10: 200,
  kwh_p50: 210,
  kwh_p90: 225,
  amount_p10: 620_000,
  amount_p90: 700_000,
  change: {
    amount: 35_000,
    parts: { used: 7_000, weather: 28_000, unexplained: 0 },
  },
  accuracy: { source: "backtest", error_pct: 0.041, cycles: 6 },
  simulated: ["heater"],
}

describe("context forecast", () => {
  it("keeps the range, the tier's odds, the reasons and what is simulated", () => {
    const f = ForecastSchema.parse(CONTEXT)
    expect(f.method).toBe("context")
    expect([f.kwh_p10, f.kwh_p90]).toEqual([200, 225])
    expect([f.amount_p10, f.amount_p90]).toEqual([620_000, 700_000])
    expect(f.next?.tier.probability).toBe(0.7)
    expect(f.accuracy).toEqual({
      source: "backtest",
      error_pct: 0.041,
      cycles: 6,
    })
    expect(f.simulated).toEqual(["heater"])
  })

  it("names the biggest reason of a change worth showing", () => {
    const s = changeSentence(ForecastSchema.parse(CONTEXT))
    expect(s).toEqual({
      amount: 35_000,
      top: "weather",
      parts: [
        ["weather", 28_000],
        ["used", 7_000],
      ],
    })
  })

  it("stays quiet under 2 % and 10.000 đ", () => {
    const small = {
      ...CONTEXT,
      change: { amount: 9_000, parts: { weather: 9_000 } },
    }
    expect(changeSentence(ForecastSchema.parse(small))).toBeNull()
    expect(
      changeSentence(ForecastSchema.parse({ ...CONTEXT, change: null }))
    ).toBeNull()
  })
})

describe("ForecastSchema", () => {
  it("names the tiers as the cards read them and dates the crossing at local midnight", () => {
    const f = ForecastSchema.parse({
      period_start: "2026-11-01",
      period_end: "2026-11-30",
      kwh: 450.5,
      amount: 1_234_567,
      tier_no: 5,
      next: {
        tier_no: 4,
        from_kwh: 200,
        price_per_kwh: 2998,
        on: "2026-11-14",
      },
      basis_days: 21,
      as_of: "2026-11-10",
      ...WEEKDAY,
    })
    expect(f.tier).toBe(5)
    expect(f.method).toBe("weekday")
    expect(f.next?.tier.tier_no).toBe(4)
    expect(f.next?.at).toBe(Date.parse("2026-11-13T17:00:00Z"))
  })

  it("keeps a cycle that stays in its tier without a crossing", () => {
    const f = ForecastSchema.parse({
      period_start: "2026-11-01",
      period_end: "2026-11-30",
      kwh: 40,
      amount: 90_000,
      tier_no: 1,
      next: null,
      basis_days: 7,
      as_of: "2026-11-10",
      ...WEEKDAY,
    })
    expect(f.next).toBeNull()
  })
})

describe("PastBillSchema", () => {
  it("labels a cycle with the month it starts in", () => {
    const b = PastBillSchema.parse({
      period_start: "2026-09-15",
      period_end: "2026-10-14",
      kwh: 580.4,
      amount: 1_834_399,
      coverage: 0.94,
      tariff_straddle: false,
    })
    expect(b.month).toBe("2026-09")
  })
})

describe("cycleDay", () => {
  const start = "2026-11-15"
  const end = "2026-12-14" // 30 days
  const at = (iso: string) => Date.parse(iso)
  it("counts the cycle's days on Vietnam days, not by rounding hours", () => {
    // 08:00 on the first day in Vietnam (01:00Z): day 1 of 30, 29 left after it.
    expect(cycleDay(start, end, at("2026-11-15T01:00:00Z"))).toEqual({
      day: 1,
      total: 30,
      left: 29,
    })
    // 23:00 the same Vietnam day (16:00Z) is still day 1.
    expect(cycleDay(start, end, at("2026-11-15T16:00:00Z")).day).toBe(1)
    // 00:30 the next Vietnam day (17:30Z) is day 2.
    expect(cycleDay(start, end, at("2026-11-15T17:30:00Z")).day).toBe(2)
  })
  it("ends on the last day with none left, and never runs past it", () => {
    expect(cycleDay(start, end, at("2026-12-14T10:00:00Z"))).toEqual({
      day: 30,
      total: 30,
      left: 0,
    })
    expect(cycleDay(start, end, at("2026-12-20T10:00:00Z")).day).toBe(30)
  })
})

describe("tierPath", () => {
  const tier = (n: number, from: number, to: number | null) => ({
    tier_no: n,
    from_kwh: from,
    to_kwh: to,
    price_per_kwh: 1000 * n,
    kwh: 0,
    amount: 0,
  })
  const tiers = [
    tier(1, 0, 50),
    tier(2, 50, 100),
    tier(3, 100, 200),
    tier(4, 200, 300),
    tier(5, 300, 400),
    tier(6, 400, null),
  ]

  it("spans the tiers up to the one the cycle ends in, filled to what is used and what is expected", () => {
    const p = tierPath(tiers, 120, 160)
    expect(p.max).toBe(200) // the end of tier 3, where 160 kWh lands
    expect(p.segments.map((s) => s.tier_no)).toEqual([1, 2, 3])
    expect(p.segments[2]).toMatchObject({
      left: 50,
      width: 50,
      used: 20, // 20 of its 100 kWh
      expected: 60,
    })
    expect(p.segments[0]).toMatchObject({ used: 100, expected: 100 })
  })

  it("ends an open top tier a little past the expected kWh", () => {
    const p = tierPath(tiers, 380, 450)
    expect(p.max).toBeCloseTo(450 * 1.1)
    expect(p.segments.at(-1)).toMatchObject({
      tier_no: 6,
      left: (400 / 495) * 100,
    })
  })

  it("draws nothing used before the first kWh", () => {
    const p = tierPath(tiers, 0, 30)
    expect(p.segments.map((s) => s.tier_no)).toEqual([1])
    expect(p.segments[0]).toMatchObject({ used: 0, expected: 60 })
  })
})

describe("bandPosition", () => {
  it("places a value in its band, clamped, the middle for a point", () => {
    expect(bandPosition(150, 100, 200)).toBe(50)
    expect(bandPosition(90, 100, 200)).toBe(0)
    expect(bandPosition(260, 100, 200)).toBe(100)
    expect(bandPosition(100, 100, 100)).toBe(50)
  })
})
