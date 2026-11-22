import { describe, expect, it } from "vitest"

import { startRange } from "../power"

const p = (ts: number) => ({ ts, watts: 100 })

describe("startRange", () => {
  it("opens on the first range when it has readings", () => {
    expect(startRange({ day: [p(1)], week: [p(1)] })).toBe("day")
  })

  it("skips ranges with no readings, so a meter gap does not open on an empty chart", () => {
    expect(startRange({ day: [], week: [], month: [p(1)] })).toBe("month")
  })

  it("stays on the first range when none has readings", () => {
    expect(startRange({ day: [], week: [] })).toBe("day")
  })
})
