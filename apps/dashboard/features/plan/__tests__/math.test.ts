import { describe, expect, it } from "vitest"

import {
  adviceRange,
  alwaysOnKwh,
  alwaysOnPresets,
  alwaysOnSteps,
  billFor,
  detectable,
  deviceVs,
  meanKwh,
  measuredBy,
  measurable,
  saving,
  outcomeOf,
  plannedDevices,
  preselected,
  tierOf,
  verdict,
  weekOf,
} from "../math"

// QĐ 2892 (from 2026-11-01), before VAT; VAT 8%.
const tiers = [
  { from_kwh: 0, to_kwh: 100, price_per_kwh: 1901 },
  { from_kwh: 100, to_kwh: 200, price_per_kwh: 2289 },
  { from_kwh: 200, to_kwh: 400, price_per_kwh: 2894 },
  { from_kwh: 400, to_kwh: 700, price_per_kwh: 3456 },
  { from_kwh: 700, to_kwh: null, price_per_kwh: 3844 },
]
const vat = 0.08

describe("billFor", () => {
  it("prices each tier's kWh in (from, to] and adds VAT", () => {
    expect(billFor(0, tiers, vat)).toBe(0)
    expect(billFor(100, tiers, vat)).toBe(Math.round(190_100 * 1.08))
    expect(billFor(150, tiers, vat)).toBe(
      Math.round((190_100 + 50 * 2289) * 1.08)
    )
    // The last tier has no top.
    expect(billFor(800, tiers, vat)).toBe(
      Math.round((190_100 + 228_900 + 578_800 + 1_036_800 + 100 * 3844) * 1.08)
    )
  })
  it("never prices below zero kWh", () => {
    expect(billFor(-5, tiers, vat)).toBe(0)
  })
})

describe("saving", () => {
  it("is worth the marginal tier, not the average price", () => {
    // 50 kWh off 750 kWh all come off tier 5.
    expect(saving(750, 50, tiers, vat)).toBe(Math.round(50 * 3844 * 1.08))
    // Across a boundary: 30 kWh off 410 is 10 at tier 4 and 20 at tier 3.
    expect(saving(410, 30, tiers, vat)).toBe(
      Math.round((10 * 3456 + 20 * 2894) * 1.08)
    )
  })
  it("cannot save more than the whole bill", () => {
    expect(saving(20, 50, tiers, vat)).toBe(billFor(20, tiers, vat))
  })
})

describe("adviceRange", () => {
  it("widens the saving by the device forecast's error, floored at 0", () => {
    expect(adviceRange(10, 25)).toEqual({ low: 7.5, high: 12.5 })
    expect(adviceRange(10, 140)).toEqual({ low: 0, high: 24 })
  })
  it("has no range without an error", () => {
    expect(adviceRange(10, null)).toBeNull()
  })
})

describe("alwaysOnSteps", () => {
  it("steps by 5 W up to the load, starting at a quarter of it", () => {
    expect(alwaysOnSteps(122)).toEqual({ min: 5, max: 120, value: 30 })
    expect(alwaysOnSteps(12)).toEqual({ min: 5, max: 10, value: 5 })
  })
  it("offers nothing under 5 W or without a load", () => {
    expect(alwaysOnSteps(4)).toBeNull()
    expect(alwaysOnSteps(null)).toBeNull()
  })
})

describe("alwaysOnKwh", () => {
  it("is the cut running all day for the days left", () => {
    expect(alwaysOnKwh(25, 10)).toBe(6)
  })
})

describe("measurable", () => {
  it("needs a daily saving of at least 2σ/√days", () => {
    // 2 × 2 / √16 = 1 kWh a day.
    expect(measurable(1, 2, 16)).toBe(true)
    expect(measurable(0.9, 2, 16)).toBe(false)
  })
  it("cannot be judged without σ or days", () => {
    expect(measurable(5, null, 16)).toBeNull()
    expect(measurable(5, 2, 0)).toBeNull()
  })
})

describe("verdict", () => {
  it("stays early inside ±2σ√n, then says which way", () => {
    // 2 × 1 × √4 = 4 kWh.
    expect(verdict(3.9, 1, 4)).toBe("early")
    expect(verdict(4.1, 1, 4)).toBe("saving")
    expect(verdict(-4.1, 1, 4)).toBe("more")
  })
  it("is early without σ or days", () => {
    expect(verdict(50, null, 4)).toBe("early")
    expect(verdict(50, 1, 0)).toBe("early")
  })
})

describe("weekOf", () => {
  it("counts 7-day blocks from the start", () => {
    expect(weekOf("2026-11-10", "2026-11-10")).toBe(0)
    expect(weekOf("2026-11-10", "2026-11-16")).toBe(0)
    expect(weekOf("2026-11-10", "2026-11-17")).toBe(1)
    expect(weekOf("2026-10-28", "2026-11-04")).toBe(1)
  })
})

describe("tierOf", () => {
  it("is the tier the next kWh falls in, 1 first", () => {
    expect(tierOf(0, tiers)).toBe(1)
    expect(tierOf(100, tiers)).toBe(1)
    expect(tierOf(100.1, tiers)).toBe(2)
    expect(tierOf(900, tiers)).toBe(5)
  })
})

describe("meanKwh", () => {
  const days = [
    { date: "2026-11-20", kwh: 1 },
    { date: "2026-11-21", kwh: 2 },
    { date: "2026-11-22", kwh: 6 },
  ]
  it("averages the days in [from, to)", () => {
    expect(meanKwh(days, "2026-11-21", "2026-11-23")).toBe(4)
  })
  it("is null with no day in range", () => {
    expect(meanKwh(days, "2026-11-23", "2026-11-30")).toBeNull()
  })
})

describe("detectable", () => {
  it("is the daily saving over the 2σ/√days bar", () => {
    // 2 × 2 / √16 = 1 kWh a day.
    expect(detectable(0.5, 2, 16)).toBeCloseTo(0.5)
    expect(detectable(1.5, 2, 16)).toBeCloseTo(1.5)
  })
  it("is null without σ or days", () => {
    expect(detectable(1, null, 16)).toBeNull()
    expect(detectable(1, 2, 0)).toBeNull()
  })
})

describe("outcomeOf", () => {
  const plan = {
    start_on: "2026-10-15",
    end_on: "2026-11-14",
    sigma: 3,
    days: [
      { date: "2026-10-15", expected: 12, actual: 10 },
      { date: "2026-10-16", expected: 12, actual: 11 },
    ],
  }
  it("reads a plan stopped mid-cycle by the Vietnam day it stopped", () => {
    // 20:00Z on the 1st is 03:00 on the 2nd in Vietnam: 18 days after the start.
    const o = outcomeOf({ ...plan, stopped_at: "2026-11-01T20:00:00Z" })
    expect(o).toMatchObject({ whole: false, ranDays: 18, saved: 3 })
  })
  it("counts a stop on the last day as stopped, and one after it as the whole cycle", () => {
    expect(
      outcomeOf({ ...plan, stopped_at: "2026-11-14T10:00:00Z" }).whole
    ).toBe(false)
    expect(
      outcomeOf({ ...plan, stopped_at: "2026-11-14T17:00:00Z" }).whole
    ).toBe(true) // 00:00 on the 15th in Vietnam
  })
  it("reads a plan never stopped (an owner's, its cycle over) as the whole cycle", () => {
    expect(outcomeOf({ ...plan, stopped_at: null })).toMatchObject({
      whole: true,
      ranDays: 0,
    })
  })
})

describe("measuredBy", () => {
  const plan = {
    end_on: "2026-12-14",
    forecast_kwh: 480,
    model_version: "ctx-v2-a",
    sigma: 3.4,
  }
  it("takes the live basis and forecast when there are", () => {
    expect(
      measuredBy(
        plan,
        {
          period_end: "2026-12-14",
          model_version: "ctx-v2-b",
          sigma: 3.1,
          earliest_start: "2026-11-20",
        },
        { kwh: 500 }
      )
    ).toEqual({
      periodEnd: "2026-12-14",
      forecastKwh: 500,
      model: "ctx-v2-b",
      sigma: 3.1,
      earliestStart: "2026-11-20",
    })
  })
  it("keeps a running plan readable from its own record when the basis is gone", () => {
    expect(measuredBy(plan, null, null)).toEqual({
      periodEnd: "2026-12-14",
      forecastKwh: 480,
      model: "ctx-v2-a",
      sigma: 3.4,
      earliestStart: null,
    })
  })
  it("has nothing without a plan or a basis", () => {
    expect(measuredBy(null, null, { kwh: 500 })).toBeNull()
  })
})

describe("alwaysOnPresets", () => {
  it("offers a quarter, a half and three quarters of the load, on the 5 W steps", () => {
    expect(alwaysOnPresets(233)).toEqual([
      { share: 0.25, watts: 55 },
      { share: 0.5, watts: 115 },
      { share: 0.75, watts: 170 },
    ])
  })
  it("drops shares that round to the same step", () => {
    expect(alwaysOnPresets(12)).toEqual([{ share: 0.25, watts: 5 }])
  })
})

describe("preselected", () => {
  const advice = [
    { id: "a.kettle_fill" },
    { id: "b.fewer_runs" },
    { id: "c.fridge_check" },
    { id: "d.heater_setpoint" },
  ]
  it("keeps the ids still advised, in order, once, at most max, and counts the gone", () => {
    expect(
      preselected(
        [
          "b.fewer_runs",
          "x.gone",
          "b.fewer_runs",
          "a.kettle_fill",
          "c.fridge_check",
          "d.heater_setpoint",
        ],
        advice,
        3
      )
    ).toEqual({
      picked: ["b.fewer_runs", "a.kettle_fill", "c.fridge_check"],
      gone: 1,
    })
  })
  it("picks nothing without ids", () => {
    expect(preselected([], advice, 3)).toEqual({ picked: [], gone: 0 })
  })
})

describe("deviceVs", () => {
  type Frozen = Record<string, { expected: number; actual: number }>
  const days: {
    date: string
    expected: number
    actual: number
    devices: Frozen
  }[] = [
    { date: "2026-11-20", expected: 9, actual: 8, devices: {} },
    {
      date: "2026-11-21",
      expected: 9,
      actual: 8,
      devices: { k: { expected: 1.2, actual: 0.8 } },
    },
    {
      date: "2026-11-22",
      expected: 9,
      actual: 8,
      devices: { k: { expected: 1.0, actual: 1.0 } },
    },
  ]
  const usual = [
    { date: "2026-11-20", kwh: 2 },
    { date: "2026-11-21", kwh: 1 },
  ]
  it("takes the device's frozen days, weather included, when it has any in the range", () => {
    expect(deviceVs(days, "k", usual, 1.5, "2026-11-20", "2026-11-23")).toEqual(
      {
        now: 0.9,
        before: 1.1,
        weather: true,
      }
    )
  })
  it("falls back to its days against its usual before the plan", () => {
    expect(deviceVs(days, "w", usual, 1.5, "2026-11-20", "2026-11-23")).toEqual(
      {
        now: 1.5,
        before: 1.5,
        weather: false,
      }
    )
    expect(
      deviceVs(days, "k", usual, 1.5, "2026-11-20", "2026-11-21")
    ).toMatchObject({
      weather: false,
    })
  })
  it("is null with nothing to compare", () => {
    expect(deviceVs(days, "w", [], 1.5, "2026-11-20", "2026-11-23")).toBeNull()
    expect(
      deviceVs(days, "w", usual, null, "2026-11-20", "2026-11-23")
    ).toBeNull()
  })
})

describe("plannedDevices", () => {
  it("keeps each device once, in plan order, and leaves out the always-on cut", () => {
    const acts = [
      { device_id: "h", key: "heater_setpoint" },
      { device_id: null, key: "always_on" },
      { device_id: "k", key: "kettle_fill" },
      { device_id: "h", key: "heater_earlier_off" },
    ]
    expect(plannedDevices(acts).map((a) => a.key)).toEqual([
      "heater_earlier_off",
      "kettle_fill",
    ])
  })
})
