import { createTranslator } from "next-intl"
import { describe, expect, it } from "vitest"

import vi from "../../../messages/vi/insight.json"
import { alertValues } from "../alert-values"

// A watch_hit stored before watches could repeat: its payload has no `repeat` (read from tb_alert).
const OLD_WATCH_HIT = {
  op: "gt",
  unit: "w",
  label: "Công suất nhà",
  value: 1320.0,
  watch_id: "01a1f70d-4a38-720d-901a-c4ddd39eb83b",
  threshold: 500.0,
}

describe("alertValues", () => {
  it("reads an old watch alert as one that does not repeat", () => {
    const t = createTranslator({ locale: "vi", messages: { insight: vi } })
    const values = alertValues(OLD_WATCH_HIT, "", (s) => s)
    expect(values.repeat).toBe("false")
    expect(() => t("insight.alerts.watch_hit.body", values)).not.toThrow()
  })

  it("keeps a stored repeat as the string ICU selects on", () => {
    expect(alertValues({ repeat: true }, "", (s) => s).repeat).toBe("true")
  })

  it("formats a run's start as a time of day", () => {
    const values = alertValues(
      { start: "2026-11-22T09:47:00Z" },
      "Microwave",
      () => "16:47"
    )
    expect(values).toMatchObject({ start: "16:47", device: "Microwave" })
  })

  it("has words without a clock time for a member who sees days only", () => {
    const t = createTranslator({ locale: "vi", messages: { insight: vi } })
    const values = alertValues(
      { value: 40, usual: 20, excess_vnd: 1000 },
      "Ấm",
      (s) => s
    )
    for (const key of [
      "device_on.title",
      "device_off.title",
      "usage_anomaly.body",
      "device_anomaly.long_run.body",
      "device_anomaly.odd_hour.body",
    ] as const) {
      const words = t(`insight.alerts.${key}`, values)
      expect(words).not.toContain("insight.")
      expect(words).not.toContain("{")
    }
  })
})
