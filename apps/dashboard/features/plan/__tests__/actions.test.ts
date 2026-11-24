import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(async () => ({ accessToken: "token" })),
}))
const createPlan = vi.fn()
const stopPlan = vi.fn()
vi.mock("../server", () => ({
  createPlan: (...a: unknown[]) => createPlan(...a),
  stopPlan: (...a: unknown[]) => stopPlan(...a),
}))

const { startPlanAction, stopPlanAction } = await import("../actions")

const input = {
  start_on: "2026-11-24",
  actions: [
    {
      device_id: null,
      key: "always_on",
      label: "Giảm tải nền",
      kwh: 27.7,
      amount: 103_464,
      baseline: 233,
      watts: 55,
    },
  ],
}

describe("startPlanAction", () => {
  beforeEach(() => {
    createPlan.mockReset()
    stopPlan.mockReset()
  })

  it("sends a valid plan", async () => {
    expect(await startPlanAction(input)).toEqual({ ok: true })
    expect(createPlan).toHaveBeenCalledWith("token", input)
  })

  it("refuses bad input before the backend", async () => {
    expect(await startPlanAction({ ...input, actions: [] })).toEqual({
      ok: false,
      code: "invalid",
    })
    expect(createPlan).not.toHaveBeenCalled()
  })

  it("returns the backend's refusal code", async () => {
    createPlan.mockRejectedValue(
      new ApiError(409, "conflict", { code: "plan_exists" })
    )
    expect(await startPlanAction(input)).toEqual({
      ok: false,
      code: "plan_exists",
    })
  })

  it("lets a server error throw", async () => {
    createPlan.mockRejectedValue(new ApiError(500, "down"))
    await expect(startPlanAction(input)).rejects.toThrow()
  })
})

describe("stopPlanAction", () => {
  it("treats a plan already gone as done", async () => {
    stopPlan.mockRejectedValue(new ApiError(404, "gone"))
    await expect(stopPlanAction()).resolves.toBeUndefined()
  })
})
