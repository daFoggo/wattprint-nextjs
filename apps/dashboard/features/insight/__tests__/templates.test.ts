import { describe, expect, it } from "vitest"

import type { AlertSource } from "../sources"
import { previewCount, templatesFor, watchInput } from "../templates"

const source = (
  key: AlertSource["key"],
  unit: AlertSource["unit"],
  values: number[],
  now: number | null = null
): AlertSource => ({
  key,
  metric:
    key === "daily" ? "today_kwh" : key === "cycle" ? "bill_vnd" : "power_w",
  unit,
  data: values.map((value, i) => ({
    key: String(i),
    value,
    label: "",
    tick: "",
  })),
  now,
})

const SOURCES = [
  source("daily", "vnd", [10_000, 20_000, 30_000, 40_000]),
  source("cycle", "vnd", [300_000, 400_000]),
  source("power", "w", [500, 1_500, 3_000]),
]

describe("templatesFor", () => {
  it("lists money, then devices, then the whole home", () => {
    expect(templatesFor(SOURCES, true).map((t) => t.key)).toEqual([
      "daily",
      "cycle",
      "device_run_min",
      "device_on",
      "device_off",
      "power",
    ])
  })

  it("leaves the device group out when the home has no named device", () => {
    expect(templatesFor(SOURCES, false).map((t) => t.group)).not.toContain(
      "device"
    )
  })

  it("sets the daily alert in kWh when no price is known", () => {
    const [daily] = templatesFor([source("daily", "kwh", [5, 8, 9])], false)
    expect(daily!.unit).toBe("kwh")
  })

  it("starts from the figure now when there is too little history", () => {
    const [cycle] = templatesFor(
      [source("cycle", "vnd", [400_000], 120_000)],
      false
    )
    expect(cycle!.start).toBe(120_000)
    expect(cycle!.step).toBe(1)
  })

  it("starts a run limit at 30 minutes in 15-minute steps", () => {
    const run = templatesFor(SOURCES, true).find(
      (t) => t.key === "device_run_min"
    )
    expect(run).toMatchObject({ unit: "min", start: 30, step: 15 })
  })
})

describe("previewCount", () => {
  it("counts the points above the threshold", () => {
    expect(previewCount([10, 50, 80], 40)).toBe(2)
  })

  it("says nothing with fewer than two points", () => {
    expect(previewCount([5], 1)).toBeNull()
  })
})

describe("watchInput", () => {
  const [daily] = templatesFor(SOURCES, false)
  const run = templatesFor(SOURCES, true).find((t) => t.key === "device_run_min")!

  it("saves a daily amount in ₫ as the kWh it buys", () => {
    expect(
      watchInput({ template: daily!, value: 30_000, price: 3_000, repeat: false, deviceId: "", label: "x" })
    ).toEqual({ metric: "today_kwh", op: "gt", threshold: 10, label: "x", repeat: false })
  })

  it("passes a kWh daily amount through when no price is known", () => {
    const [kwh] = templatesFor([source("daily", "kwh", [5, 8, 9])], false)
    expect(
      watchInput({ template: kwh!, value: 8, price: 3_000, repeat: true, deviceId: "", label: "x" }).threshold
    ).toBe(8)
  })

  it("ties a device rule to its device and always repeats it", () => {
    expect(
      watchInput({ template: run, value: 60, price: null, repeat: false, deviceId: "d1", label: "x" })
    ).toMatchObject({ device_id: "d1", repeat: true, threshold: 60 })
  })
})
