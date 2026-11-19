import { describe, expect, it } from "vitest"

import { cyclePassed, forecastConfidence } from "../../billing/forecast"
import { ForecastSchema } from "../../billing/schemas"
import { mixConfidence, otherShare } from "../confidence"

describe("confidence of what the models make", () => {
  it("trusts the device split less as more energy is left as Other", () => {
    const share = otherShare([
      { type: "fridge", kwh: 30 },
      { type: "other", kwh: 70 },
    ])
    expect(share).toBe(0.7)
    expect([0.1, 0.3, share].map(mixConfidence)).toEqual([
      "high",
      "medium",
      "low",
    ])
    expect(otherShare([])).toBe(0)
  })

  it("trusts a forecast with more days behind it, later in the cycle", () => {
    const f = (basis_days: number, as_of: string) =>
      ForecastSchema.parse({
        period_start: "2026-11-01",
        period_end: "2026-11-30",
        kwh: 1,
        amount: 1,
        tier_no: 1,
        next: null,
        basis_days,
        as_of,
      })
    expect(cyclePassed(f(28, "2026-11-16"))).toBe(0.5)
    expect(forecastConfidence(f(28, "2026-11-16"))).toBe("high")
    expect(forecastConfidence(f(28, "2026-11-04"))).toBe("low")
    expect(forecastConfidence(f(10, "2026-11-20"))).toBe("low")
    expect(forecastConfidence(f(18, "2026-11-20"))).toBe("medium")
  })
})
