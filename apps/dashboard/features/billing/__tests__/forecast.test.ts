import { describe, expect, it } from "vitest"

import { projectBill, tieredAmount } from "../forecast"
import type { CurrentBill } from "../schemas"

// The 2025 residential tariff (VND/kWh before VAT).
const tiers = [
  { tier_no: 1, from_kwh: 0, to_kwh: 50, price_per_kwh: 1984 },
  { tier_no: 2, from_kwh: 50, to_kwh: 100, price_per_kwh: 2050 },
  { tier_no: 3, from_kwh: 100, to_kwh: 200, price_per_kwh: 2380 },
  { tier_no: 4, from_kwh: 200, to_kwh: 300, price_per_kwh: 2998 },
  { tier_no: 5, from_kwh: 300, to_kwh: 400, price_per_kwh: 3350 },
  { tier_no: 6, from_kwh: 400, to_kwh: null, price_per_kwh: 3460 },
].map((x) => ({ ...x, kwh: 0, amount: 0 }))

describe("tieredAmount", () => {
  it("prices each tier at its own rate", () => {
    expect(tieredAmount(0, tiers)).toBe(0)
    expect(tieredAmount(50, tiers)).toBe(99_200)
    expect(tieredAmount(120, tiers)).toBe(99_200 + 102_500 + 20 * 2380)
    expect(tieredAmount(450, tiers)).toBe(
      99_200 + 102_500 + 238_000 + 299_800 + 335_000 + 50 * 3460
    )
  })
})

describe("projectBill", () => {
  const bill = {
    period_start: "2026-11-01",
    period_end: "2026-11-30",
    tier_no: 3,
    kwh: 150,
    vat_rate: 0.08,
    tiers,
  } as CurrentBill
  // Exactly 10 days in: 15 kWh a day.
  const now = Date.parse("2026-11-11T00:00:00+07:00")

  it("runs the pace so far to the end of the cycle", () => {
    const p = projectBill(bill, now)
    expect(p.days).toBe(30)
    expect(p.kwh).toBeCloseTo(450)
    expect(p.tier).toBe(6)
    expect(p.amount).toBe(Math.round(tieredAmount(450, tiers) * 1.08))
  })

  it("dates the next tier", () => {
    const p = projectBill(bill, now)
    expect(p.next?.tier.tier_no).toBe(4)
    // 50 kWh to go at 15 a day.
    expect(p.next?.at).toBeCloseTo(now + (50 / 15) * 86_400_000)
  })

  it("has no next tier when the pace does not reach it this cycle", () => {
    // 1 kWh a day: tier 2 (50 kWh) is 40 days away.
    expect(projectBill({ ...bill, kwh: 10, tier_no: 1 }, now).next).toBeNull()
  })
})
