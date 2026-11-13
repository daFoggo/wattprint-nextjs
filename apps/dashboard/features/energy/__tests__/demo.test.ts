import { describe, expect, it } from "vitest"

import {
  demoActivity,
  demoDevice,
  demoDevices,
  isDeviceKey,
  type Meter,
} from "../demo"
import { DAY, localDate } from "../days"

// 2026-11-13 18:30 in Hanoi.
const now = Date.parse("2026-11-13T11:30:00Z")
// 12 kWh a day on the meter (today so far: 9), 120 W in the background, 600 W now.
const meter: Meter = {
  kwh: new Map(
    Array.from({ length: 20 }, (_, i) => [localDate(now - i * DAY), i ? 12 : 9])
  ),
  baseline: 120,
  live: 600,
}

describe("demo devices", () => {
  it("gives the same figures for the same moment", () => {
    expect(demoDevices(now, meter)).toEqual(demoDevices(now, meter))
  })

  it("agrees between the list and a device's page", () => {
    const fridge = demoDevice("fridge", now, meter)
    const days = fridge.days.reduce((s, d) => s + d.kwh, 0)
    expect(fridge.days).toHaveLength(13)
    expect(days).toBeCloseTo(fridge.month_kwh, 6)
    expect(fridge.days.at(-1)!.kwh).toBeCloseTo(fridge.today_kwh, 6)
    expect(fridge.week_kwh.at(-1)).toBeCloseTo(fridge.today_kwh, 6)
    expect(fridge.power).toHaveLength(288)
  })

  it("never reports a run that has not started, and only running runs lack an end", () => {
    for (const run of demoActivity(now, meter)) {
      expect(run.start).toBeLessThanOrEqual(now)
      if (run.end !== null) expect(run.end).toBeLessThanOrEqual(now)
    }
    expect(demoActivity(now, meter).some((run) => run.key === "fridge")).toBe(
      false
    )
  })

  it("splits the whole month between the devices", () => {
    const shares = demoDevices(now, meter).map(
      (d) => demoDevice(d.key, now, meter).home_share
    )
    expect(shares.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 6)
  })

  it("adds up to the meter: always on is the background load, other the rest", () => {
    const rows = demoDevices(now, meter)
    const sum = (key: "today_kwh" | "month_kwh") =>
      rows.reduce((s, d) => s + d[key], 0)
    expect(sum("today_kwh")).toBeCloseTo(9, 6)
    // "Other" never goes below 0, so a day the scaled schedule beats the meter adds a little on top.
    expect(sum("month_kwh")).toBeGreaterThanOrEqual(12 * 12 + 9 - 1e-6)
    expect(sum("month_kwh") / (12 * 12 + 9)).toBeLessThan(1.02)
    expect(rows.find((d) => d.key === "alwaysOn")!.watts).toBe(120)
  })

  it("knows only its own devices, not what objects inherit", () => {
    expect(isDeviceKey("fridge")).toBe(true)
    expect(isDeviceKey("constructor")).toBe(false)
    expect(isDeviceKey("toString")).toBe(false)
  })
})
