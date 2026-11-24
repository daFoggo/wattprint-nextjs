import { describe, expect, it } from "vitest"

import {
  band,
  barWidth,
  evidenceDir,
  trackMax,
  versusUsual,
  weekTotals,
} from "../device-forecast"
import { DeviceForecastsSchema } from "../schemas"

// GET /billing/devices/forecast for REFIT House 5 (app/modules/billing/schemas/schema_device_forecast.py).
const HOUSE5 = {
  period_end: "2026-11-30",
  as_of: "2026-11-23",
  devices: [
    {
      device_id: "01a1ead9-d495-7c85-a2e5-56e6d2aa2150",
      name: "Washing Machine",
      type: "washing_machine",
      simulated: false,
      method: "model",
      confidence: "medium",
      error_pct: 31.4,
      backtest_days: 14,
      next_days: [
        {
          date: "2026-11-23",
          kwh: 0.6,
          kwh_p10: 0.2,
          kwh_p90: 1.2,
          amount: 1800,
        },
        {
          date: "2026-11-24",
          kwh: null,
          kwh_p10: null,
          kwh_p90: null,
          amount: null,
        },
      ],
      kwh: 4.2,
      kwh_p10: 2.1,
      kwh_p90: 7.0,
      amount: 12600,
      explain: {
        usual_kwh_day: 0.5,
        forecast_kwh_day: 0.6,
        explainable: true,
        factors: [
          {
            key: "temperature",
            kwh_day: 0.08,
            amount: 1680,
            now: 5,
            before: 9,
            recent_temp: null,
            usual_temp: null,
          },
          {
            key: "calendar",
            kwh_day: -0.04,
            amount: -840,
            now: 3,
            before: 2,
            recent_temp: null,
            usual_temp: null,
          },
        ],
        busiest: {
          date: "2026-11-23",
          kwh: 0.6,
          kwh_p10: 0.2,
          kwh_p90: 1.2,
          amount: 1800,
        },
      },
      advice: [
        {
          key: "fewer_runs",
          saved_kwh: 1.7,
          saved_amount: 5100,
          avoids_tier: null,
          params: { runs_per_week: 4, kwh_per_run: 1.5 },
        },
      ],
    },
  ],
}

describe("device forecasts", () => {
  const [d] = DeviceForecastsSchema.parse(HOUSE5).devices

  it("places a day's range and middle on the track", () => {
    expect(trackMax(d!.next_days)).toBe(1.2)
    expect(band(d!.next_days[0]!, 1.2)).toEqual({
      low: (0.2 / 1.2) * 100,
      high: 100,
      mid: 50,
    })
    expect(band(d!.next_days[1]!, 1.2)).toBeNull() // no forecast for that day
  })

  it("tells the week against the usual and each factor's direction and bar", () => {
    const e = d!.explain!
    expect(versusUsual(e)).toEqual({ dir: "up", pct: 20 })
    expect(versusUsual({ ...e, forecast_kwh_day: 0.51 }).dir).toBe("same")
    expect(evidenceDir(e.factors[0]!)).toBe("down") // 5 °C against 9 °C: colder
    expect(barWidth(e.factors[0]!, e.factors)).toBe(50)
    expect(barWidth(e.factors[1]!, e.factors)).toBe(25)
    expect(weekTotals(d!.next_days)).toEqual({ kwh: 0.6, amount: 1800 })
  })

  it("words the factors in Vietnamese with their evidence", async () => {
    const { createTranslator } = await import("next-intl")
    const vi = (await import("../../../messages/vi/billing.json")).default
    const t = createTranslator({ locale: "vi", messages: { billing: vi } })
    expect(
      t("billing.deviceForecast.factor.temperature", {
        dir: "down",
        now: 5.06,
        before: 6.92,
      })
    ).toBe("Trời lạnh hơn: trung bình 5,1°C (4 tuần qua 6,9°C)")
    expect(
      t("billing.deviceForecast.trendCause", {
        dir: "down",
        recent: 5.46,
        usual: 6.92,
      })
    ).toBe("— tuần qua cũng lạnh hơn (5,5°C so với 6,9°C)")
  })
})

describe("advice copy", () => {
  it("formats its figures in the reader's language", async () => {
    const { createTranslator } = await import("next-intl")
    const vi = (await import("../../../messages/vi/billing.json")).default
    const t = createTranslator({ locale: "vi", messages: { billing: vi } })
    const text = t("billing.deviceForecast.tip.fewer_runs", {
      runs_per_week: 3.5,
      kwh_per_run: 1.25,
    })
    expect(text).toContain("3,5 lần")
    expect(text).toContain("1,25 kWh")
  })
})
