import { describe, expect, it } from "vitest"

import { alertSources, avgPrice, toKwh } from "../sources"

const days = [
  { date: "2026-11-19", value: 10 },
  { date: "2026-11-20", value: 20 },
  { date: "2026-11-21", value: 5 },
]
const bills = [
  { month: "2026-09", amount: 900000 },
  { month: "2026-10", amount: 1100000 },
]
const power = [
  { ts: Date.UTC(2026, 10, 21, 1, 0), watts: 400 },
  { ts: Date.UTC(2026, 10, 21, 1, 30), watts: 900 },
  { ts: Date.UTC(2026, 10, 21, 2, 0), watts: 300 },
]

describe("avgPrice and toKwh", () => {
  it("prices a kWh by the running cycle, or not at all", () => {
    expect(avgPrice({ kwh: 200, amount_total: 600000 })).toBe(3000)
    expect(avgPrice({ kwh: 0, amount_total: 0 })).toBeNull()
    expect(avgPrice(null)).toBeNull()
  })

  it("turns a money threshold into kWh to a tenth", () => {
    expect(toKwh(54000, 3000)).toBe(18)
    expect(toKwh(10000, 3000)).toBe(3.3)
  })
})

describe("alertSources", () => {
  it("draws the daily cost in money when there is a price", () => {
    const [daily] = alertSources({
      days,
      bills,
      power,
      price: 3000,
      locale: "vi",
    })
    expect(daily).toMatchObject({
      key: "daily",
      metric: "today_kwh",
      unit: "vnd",
    })
    expect(daily!.data.map((d) => d.value)).toEqual([30000, 60000])
    expect(daily!.now).toBe(15000) // today, still running, is the figure now, not a bar
  })

  it("falls back to kWh without a price", () => {
    const [daily] = alertSources({
      days,
      bills,
      power,
      price: null,
      locale: "vi",
    })
    expect(daily).toMatchObject({ unit: "kwh" })
    expect(daily!.data.map((d) => d.value)).toEqual([10, 20])
  })

  it("draws past bills and hourly peaks", () => {
    const [, cycle, watts] = alertSources({
      days,
      bills,
      power,
      price: 3000,
      locale: "vi",
    })
    expect(cycle).toMatchObject({
      key: "cycle",
      metric: "bill_vnd",
      unit: "vnd",
    })
    expect(cycle!.data.map((d) => d.value)).toEqual([900000, 1100000])
    expect(watts).toMatchObject({ key: "power", metric: "power_w", unit: "w" })
    expect(watts!.data.map((d) => d.value)).toEqual([900, 300])
  })
})

describe("lineScale", () => {
  it("steps by a round number and starts on a step above the usual", async () => {
    const { lineScale } = await import("../sources")
    expect(lineScale([1000, 1500, 2492, 2300, 1994])).toEqual({
      step: 50,
      start: 2300,
    })
    expect(lineScale([30000, 36968, 52000, 61000, 44000])).toEqual({
      step: 2000,
      start: 52000,
    })
    expect(lineScale([0.4, 0.9])).toEqual({ step: 0.02, start: 0.4 })
  })
})

describe("unitLabel", () => {
  it("takes the word for minutes from Intl, in the reader's language", async () => {
    const { formatFigure } = await import("../schemas")
    expect(formatFigure(95, "min", "vi")).toBe("95 phút")
    expect(formatFigure(95, "min", "en")).toBe("95 minutes")
    expect(formatFigure(1, "min", "en")).toBe("1 minute")
    expect(formatFigure(1200, "w", "vi")).toBe("1.200 W")
  })
})
