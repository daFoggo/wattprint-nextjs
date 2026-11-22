import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

import { WatchSchema } from "../schemas"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(async () => ({ accessToken: "token" })),
}))
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "vi"),
  getTranslations: vi.fn(
    async () => (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key
  ),
}))
const createWatch = vi.fn()
const cancelWatch = vi.fn()
const fetchWatches = vi.fn()
vi.mock("../server", () => ({
  createWatch: (...a: unknown[]) => createWatch(...a),
  cancelWatch: (...a: unknown[]) => cancelWatch(...a),
  fetchWatches: (...a: unknown[]) => fetchWatches(...a),
}))

const { saveWatchAction, setDeviceEventAction } = await import("../actions")

const DEVICE = "01a1eadb-8578-707d-9d47-51f1374e3153"
const ID = "01a1fc47-cd24-7177-bb6b-d51efe7f9623"
const row = (over: Record<string, unknown>) =>
  WatchSchema.parse({
    id: ID,
    label: "Máy giặt bật",
    metric: "device_on",
    device_id: DEVICE,
    op: "gt",
    threshold: "0",
    unit: "",
    status: "active",
    repeat: true,
    last_value: null,
    last_checked_at: null,
    fired_at: null,
    ends_at: "2027-11-21T08:00:00Z",
    created_at: "2026-11-21T08:00:00Z",
    ...over,
  })

describe("WatchSchema", () => {
  it("reads a backend row whose decimals are strings", () => {
    const w = row({
      metric: "power_w",
      threshold: "3000.000",
      last_value: "812.5",
    })
    expect([w.threshold, w.last_value, w.repeat]).toEqual([3000, 812.5, true])
  })
})

describe("saveWatchAction", () => {
  beforeEach(() => {
    createWatch.mockReset()
  })

  it("sends the alert set on the line", async () => {
    const input = {
      metric: "today_kwh",
      op: "gt",
      threshold: 18,
      label: "Tiền điện mỗi ngày",
      repeat: true,
    }
    expect(await saveWatchAction(input)).toEqual({ ok: true })
    expect(createWatch).toHaveBeenCalledWith("token", input)
  })

  it("refuses what is not an alert", async () => {
    const result = await saveWatchAction({
      metric: "sql",
      op: "gt",
      threshold: 1,
    })
    expect(result).toEqual({ ok: false, error: "errors.invalid" })
    expect(createWatch).not.toHaveBeenCalled()
  })

  it("says why the backend refused, with the value in its unit", async () => {
    createWatch.mockRejectedValue(
      new ApiError(409, "past", {
        code: "already_crossed",
        value_now: "1250000",
      })
    )
    const result = await saveWatchAction({
      metric: "bill_vnd",
      op: "gt",
      threshold: 1000000,
      label: "Tiền điện kỳ này",
      repeat: false,
    })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain("1.250.000 ₫")
  })

  it("lets an unexpected failure throw", async () => {
    createWatch.mockRejectedValue(new ApiError(500, "boom"))
    await expect(
      saveWatchAction({
        metric: "power_w",
        op: "gt",
        threshold: 3000,
        label: "Công suất",
        repeat: true,
      })
    ).rejects.toThrow("boom")
  })
})

describe("setDeviceEventAction", () => {
  beforeEach(() => {
    createWatch.mockReset()
    cancelWatch.mockReset()
    fetchWatches.mockReset()
  })

  it("turning on replaces any active one, so there is never two", async () => {
    fetchWatches.mockResolvedValue([row({})])
    expect(
      await setDeviceEventAction(DEVICE, "device_on", true, "Máy giặt bật")
    ).toEqual({ ok: true })
    expect(cancelWatch).toHaveBeenCalledWith("token", ID)
    expect(createWatch).toHaveBeenCalledWith("token", {
      metric: "device_on",
      op: "gt",
      threshold: 0,
      label: "Máy giặt bật",
      device_id: DEVICE,
      repeat: true,
    })
  })

  it("says why when the backend refuses, so the switch can flip back", async () => {
    fetchWatches.mockResolvedValue([])
    createWatch.mockRejectedValue(
      new ApiError(409, "many", { code: "too_many" })
    )
    const result = await setDeviceEventAction(
      DEVICE,
      "device_on",
      true,
      "Máy giặt bật"
    )
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain("errors.too_many")
  })

  it("turning off only cancels, and leaves the other event alone", async () => {
    fetchWatches.mockResolvedValue([
      row({}),
      row({ id: "01a1fc47-cd24-7177-bb6b-d51efe7f9624", metric: "device_off" }),
    ])
    await setDeviceEventAction(DEVICE, "device_on", false, "Máy giặt bật")
    expect(cancelWatch).toHaveBeenCalledTimes(1)
    expect(createWatch).not.toHaveBeenCalled()
  })
})

describe("AlertSchema", () => {
  it("reads a repeating watch's alert and a device run alert", async () => {
    const { AlertSchema } = await import("../schemas")
    const base = {
      id: "a",
      severity: "warning",
      status: "open",
      ts: "2026-11-21T08:00:00Z",
      device: null,
    }
    const hit = {
      watch_id: "w",
      label: "Tiền điện",
      op: "gt",
      threshold: 1,
      unit: "vnd",
    }
    expect(
      AlertSchema.safeParse({
        ...base,
        kind: "watch_hit",
        payload: { ...hit, repeat: true },
      }).success
    ).toBe(true)
    expect(
      AlertSchema.safeParse({
        ...base,
        kind: "device_long_run",
        payload: {
          ...hit,
          device: "Máy giặt",
          at: "2026-11-21T08:00:00Z",
          value: 95,
        },
      }).success
    ).toBe(true)
  })
})
