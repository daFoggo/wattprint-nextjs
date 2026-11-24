import { describe, expect, it } from "vitest"

import en from "@/messages/en/insight.json"
import vi from "@/messages/vi/insight.json"

import { alertKey, DEVICE_SIGNALS } from "../alert-values"
import { AlertSchema } from "../schemas"

const ID = "01a1eadb-8578-707d-9d47-51f1374e3153"

describe("device_anomaly alerts", () => {
  it("parse with their signal", () => {
    const a = AlertSchema.parse({
      id: ID,
      kind: "device_anomaly",
      severity: "warning",
      status: "open",
      ts: "2026-11-23T06:00:00Z",
      device: { id: ID, name: "Washing Machine", type: "washing_machine" },
      payload: { signal: "long_run", value: 190, usual: 100, unit: "min" },
      feedback: null,
    })
    expect(alertKey(a)).toBe("device_anomaly.long_run")
  })

  it("other kinds keep their own key", () => {
    expect(alertKey({ kind: "tier_near", payload: {} })).toBe("tier_near")
  })

  it("have a title and a body for each signal in both languages", () => {
    for (const m of [vi, en]) {
      const copy = m.alerts.device_anomaly as Record<
        string,
        { title: string; body: string }
      >
      for (const s of DEVICE_SIGNALS) {
        expect(copy[s]?.title).toBeTruthy()
        expect(copy[s]?.body).toBeTruthy()
      }
    }
  })
})
