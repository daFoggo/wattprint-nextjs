import { describe, expect, it } from "vitest"

import { axisLabels, chartView, tableCell } from "../chart"
import type { Widget } from "../schemas"

type Chart = Extract<Widget, { kind: "chart" }>
const base: Chart = {
  kind: "chart",
  type: "line",
  title: null,
  labels: ["a", "b"],
  series: [{ label: "kWh", unit: "kWh", values: [1, 2] }],
  columns: ["day", "kwh"],
  rows: [
    ["a", 1],
    ["b", 2],
  ],
}
const two = [...base.series, { label: "W", unit: null, values: [3, 4] }]

describe("chartView", () => {
  it("draws each type with its component", () => {
    expect(chartView(base).view).toBe("area")
    expect(chartView({ ...base, type: "area" }).view).toBe("area")
    expect(chartView({ ...base, type: "bar" }).view).toBe("combo")
    expect(chartView({ ...base, type: "bar", series: two }).view).toBe("area")
    expect(chartView({ ...base, type: "donut" }).view).toBe("donut")
    expect(chartView({ ...base, type: "kpi" }).view).toBe("kpi")
    expect(chartView({ ...base, type: "table" }).view).toBe("table")
  })

  it("shows the table when a value is missing or nothing can be drawn", () => {
    const gap = [{ label: "kWh", unit: null, values: [1, null] }]
    expect(chartView({ ...base, series: gap }).view).toBe("table")
    expect(chartView({ ...base, series: [] }).view).toBe("table")
    expect(chartView({ ...base, type: "donut", series: two }).view).toBe(
      "table"
    )
  })

  it("puts a unit on the chart only when every series shares it", () => {
    expect(chartView({ ...base, type: "line" })).toMatchObject({ unit: "kWh" })
    const mixed = [
      { label: "kWh", unit: "kWh", values: [1, 2] },
      { label: "W", unit: "W", values: [3, 4] },
    ]
    expect(chartView({ ...base, series: mixed })).toMatchObject({
      unit: undefined,
    })
  })

  it("keeps the values of a drawable chart", () => {
    const v = chartView(base)
    expect(v.view === "area" && v.series).toEqual([
      { id: "0", label: "kWh", values: [1, 2] },
    ])
  })
})

describe("axisLabels", () => {
  it("reads hours of one day as times", () => {
    expect(
      axisLabels(
        ["2026-11-19T00:00:00+07:00", "2026-11-19T13:00:00+07:00"],
        "vi"
      )
    ).toEqual(["00:00", "13:00"])
  })

  it("reads midnights as days", () => {
    expect(
      axisLabels(
        ["2026-11-13T00:00:00+07:00", "2026-11-14T00:00:00+07:00"],
        "vi"
      )
    ).toEqual(["13/11", "14/11"])
  })

  it("adds the day when hours run over two days", () => {
    expect(
      axisLabels(
        [
          "2026-11-19T23:00:00+07:00",
          "2026-11-20T00:00:00+07:00",
          "2026-11-20T01:00:00+07:00",
        ],
        "vi"
      )
    ).toEqual(["23:00 19/11", "00:00 20/11", "01:00 20/11"])
  })

  it("leaves anything else as it is", () => {
    expect(axisLabels(["Tủ lạnh", "2026-11-13T00:00:00+07:00"], "vi")).toEqual([
      "Tủ lạnh",
      "2026-11-13T00:00:00+07:00",
    ])
  })
})

describe("bar average", () => {
  it("is the period's mean at every point, not a running one", () => {
    const v = chartView({
      ...base,
      type: "bar",
      labels: ["a", "b", "c"],
      series: [{ label: "kWh", unit: null, values: [10, 2, 3] }],
    })
    expect(v.view === "combo" && v.average).toEqual([5, 5, 5])
  })
})

describe("tableCell", () => {
  it("formats numbers and times in the reader's language", () => {
    expect(tableCell(9.743333, "vi")).toBe("9,74")
    expect(tableCell(1630000, "vi")).toBe("1.630.000")
    expect(tableCell("2026-11-13T00:00:00+07:00", "vi")).toBe("13/11/2026")
    expect(tableCell("2026-11-13T13:00:00+07:00", "vi")).toBe(
      "13:00 13/11/2026"
    )
    expect(tableCell("2026-11-05", "vi")).toBe("05/11/2026")
    expect(tableCell("Tủ lạnh", "vi")).toBe("Tủ lạnh")
    expect(tableCell(null, "vi")).toBe("")
  })
})
