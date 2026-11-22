import { describe, expect, it } from "vitest"

import { editableNumber, parseNumber } from "./parse-number"

describe("parseNumber", () => {
  it("reads a Vietnamese amount with dots between thousands", () => {
    expect(parseNumber("500.000", "vi")).toBe(500_000)
    expect(parseNumber("1,5", "vi")).toBe(1.5)
  })

  it("reads an English amount with commas between thousands", () => {
    expect(parseNumber("1,400,000.5", "en")).toBe(1_400_000.5)
  })

  it("reads a bare number and gives NaN for words", () => {
    expect(parseNumber("1400000", "vi")).toBe(1_400_000)
    expect(parseNumber("abc", "vi")).toBeNaN()
  })
})

describe("editableNumber", () => {
  it("writes a value so parseNumber reads it back unchanged", () => {
    for (const locale of ["vi", "en"])
      for (const n of [8.2, 1_400_000, 0.25])
        expect(parseNumber(editableNumber(n, locale), locale)).toBe(n)
  })
})
