import { describe, expect, it } from "vitest"

import {
  PlanBasisSchema,
  PlanHistorySchema,
  PlanCreateSchema,
  PlanSchema,
} from "../schemas"

const action = {
  device_id: "0192a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
  key: "fewer_runs",
  label: "Bớt 1 lần chạy mỗi tuần",
  kwh: 3.2,
  amount: 11_000,
  baseline: 0.9,
  watts: null,
}

describe("PlanSchema", () => {
  it("reads GET /insights/plans/current", () => {
    const plan = PlanSchema.parse({
      id: "0192a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c",
      start_on: "2026-11-20",
      end_on: "2026-12-14",
      model_version: "ctx-v2-20261119031500",
      sigma: 3.35,
      bias: 2.86,
      forecast_kwh: 509.6,
      actions: [action],
      days: [
        {
          date: "2026-11-20",
          expected: 12.9,
          actual: 12.5,
          devices: {
            "0192a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5d": {
              expected: 1.2,
              actual: 0.9,
            },
          },
        },
      ],
      status: "active",
      created_at: "2026-11-24T05:00:00Z",
      extra: "dropped",
    })
    expect(plan.days[0]).toEqual({
      date: "2026-11-20",
      expected: 12.9,
      actual: 12.5,
      devices: {
        "0192a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5d": { expected: 1.2, actual: 0.9 },
      },
    })
    expect("extra" in plan).toBe(false)
  })
})

describe("PlanHistorySchema", () => {
  it("reads GET /insights/plans/history: how each plan ended and whose it is", () => {
    const [item] = PlanHistorySchema.parse([
      {
        id: "0192a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c",
        start_on: "2026-10-15",
        end_on: "2026-11-14",
        model_version: "holdout-2026-10-15",
        sigma: 3.9,
        bias: 1.2,
        forecast_kwh: 480,
        actions: [action],
        days: [],
        status: "stopped",
        created_at: "2026-10-14T17:00:00Z",
        stopped_at: "2026-11-14T17:00:00Z",
        mine: false,
      },
    ])
    expect(item?.mine).toBe(false)
    expect(item?.stopped_at).toBe("2026-11-14T17:00:00Z")
  })
})

describe("PlanCreateSchema", () => {
  it("takes 1 to 3 known actions with finite, non-negative numbers", () => {
    const ok = { start_on: "2026-11-24", actions: [action] }
    expect(PlanCreateSchema.safeParse(ok).success).toBe(true)
    for (const bad of [
      { ...ok, actions: [] },
      { ...ok, actions: [action, action, action, action] },
      { ...ok, actions: [{ ...action, key: "shift_load" }] },
      { ...ok, actions: [{ ...action, kwh: -1 }] },
      { ...ok, actions: [{ ...action, device_id: "x" }] },
      { ...ok, start_on: "24/11" },
    ])
      expect(PlanCreateSchema.safeParse(bad).success).toBe(false)
  })
})

describe("PlanBasisSchema", () => {
  it("reads GET /insights/plans/basis, sigma null under 14 days", () => {
    const b = PlanBasisSchema.parse({
      model_version: "none",
      sigma: null,
      bias: 0,
      earliest_start: "2026-11-15",
      period_end: "2026-12-14",
    })
    expect(b.sigma).toBeNull()
  })
})
