import { describe, expect, it } from "vitest"

import { ForecastSchema, PastBillSchema } from "../schemas"

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
    })
    expect(f.tier).toBe(5)
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
