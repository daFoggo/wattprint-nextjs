import { describe, expect, it } from "vitest"

import { citedSegments, plainText } from "../text"

const sources = [
  { title: "Công tơ tổng", url: "/dashboard/statistics" },
  { title: "Biểu giá EVN", url: "https://evn.example" },
]

describe("citedSegments", () => {
  it("marks a source once, at its first figure, with a bare number (the link is in the legend)", () => {
    const { segments, cited } = citedSegments(
      "Tốn 5 kWh [1], rồi 7 kWh [1] và 3 đ [2].",
      sources
    )
    expect(segments).toEqual([
      "Tốn 5 kWh",
      { type: "citation", label: "1" },
      ", rồi 7 kWh, và 3 đ".replace(", và", " và"),
      { type: "citation", label: "2" },
      ".",
    ])
    expect(cited).toEqual([
      { n: 1, ...sources[0] },
      { n: 2, ...sources[1] },
    ])
  })

  it("renumbers sources 1, 2, 3 in the order the answer cites them", () => {
    const { segments, cited } = citedSegments("A [2] rồi B [1].", sources)
    expect(segments).toEqual([
      "A",
      { type: "citation", label: "1" },
      " rồi B",
      { type: "citation", label: "2" },
      ".",
    ])
    expect(cited).toEqual([
      { n: 1, ...sources[1] },
      { n: 2, ...sources[0] },
    ])
  })

  it("drops marks with no source behind them (still streaming, or a wrong number)", () => {
    expect(citedSegments("Tốn 5 kWh [1].", []).segments).toEqual(["Tốn 5 kWh."])
    expect(citedSegments("Tốn 5 kWh [9].", sources).cited).toEqual([])
  })
})

describe("plainText", () => {
  it("drops the markdown marks Wappi sometimes writes, keeping the words", () => {
    expect(plainText("Dùng **bình nóng lạnh** nhiều nhất")).toBe(
      "Dùng bình nóng lạnh nhiều nhất"
    )
    expect(plainText("__đậm__ và `mã`")).toBe("đậm và mã")
    expect(plainText("## Tiêu đề\n- một\n* hai")).toBe("Tiêu đề\nmột\nhai")
  })

  it("drops numbered list marks but not a year or figure that starts a line", () => {
    expect(plainText("1. một\n2) hai\n12. mười hai")).toBe(
      "một\nhai\nmười hai"
    )
    expect(plainText("2024. Tốn 5 kWh")).toBe("2024. Tốn 5 kWh")
  })

  it("leaves citations, units and a lone star alone", () => {
    expect(plainText("Tốn 12 kWh [1] (5 * 2)")).toBe("Tốn 12 kWh [1] (5 * 2)")
    expect(plainText("Tổng\n5 * 2 = 10")).toBe("Tổng\n5 * 2 = 10")
    expect(plainText("**12 kWh** [1]")).toBe("12 kWh [1]")
  })
})
