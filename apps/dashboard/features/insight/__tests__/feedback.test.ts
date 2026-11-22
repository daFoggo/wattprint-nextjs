import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

import { AlertSchema } from "../schemas"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(async () => ({ accessToken: "token" })),
}))
const sendAlertFeedback = vi.fn()
vi.mock("../server", () => ({
  sendAlertFeedback: (...a: unknown[]) => sendAlertFeedback(...a),
}))

const { sendAlertFeedbackAction } = await import("../actions")

const ID = "01a1eadb-8578-707d-9d47-51f1374e3153"

describe("usage_anomaly alerts", () => {
  it("parse with the caller's verdict and their figures", () => {
    const a = AlertSchema.parse({
      id: ID,
      kind: "usage_anomaly",
      severity: "warning",
      status: "open",
      ts: "2026-11-21T08:30:00Z",
      device: null,
      payload: {
        excess_kwh: 2.1,
        excess_vnd: 6500,
        start: "2026-11-21T07:00:00+00:00",
      },
      feedback: "not_anomaly",
    })
    expect(a.feedback).toBe("not_anomaly")
    expect(a.payload.excess_vnd).toBe(6500)
  })

  it("an alert without a verdict reads null", () => {
    const a = AlertSchema.parse({
      id: ID,
      kind: "tier_near",
      severity: "info",
      status: "open",
      ts: "2026-11-21T08:30:00Z",
      device: null,
      payload: {},
      feedback: null,
    })
    expect(a.feedback).toBeNull()
  })
})

describe("sendAlertFeedbackAction", () => {
  beforeEach(() => sendAlertFeedback.mockReset())

  it("sends a valid verdict", async () => {
    await sendAlertFeedbackAction(ID, "useful")
    expect(sendAlertFeedback).toHaveBeenCalledWith("token", ID, "useful")
  })

  it("rejects a bad verdict or id without calling the backend", async () => {
    await sendAlertFeedbackAction(ID, "maybe")
    await sendAlertFeedbackAction("not-a-uuid", "useful")
    expect(sendAlertFeedback).not.toHaveBeenCalled()
  })

  it("an alert gone from the home (404) is not an error", async () => {
    sendAlertFeedback.mockRejectedValueOnce(
      new ApiError(404, "alert_not_found", "gone")
    )
    await expect(sendAlertFeedbackAction(ID, "useful")).resolves.toBeUndefined()
  })
})
