import { describe, expect, it } from "vitest"

import { changeSentence } from "../forecast"
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
