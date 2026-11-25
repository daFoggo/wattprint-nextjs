import { describe, expect, it } from "vitest"

import { advance, ask, START } from "../wappi-steps"

describe("Wappi band steps", () => {
  it("a first question goes read → work → done", () => {
    const asked = ask(START, "bill")
    expect(asked).toMatchObject({ asked: "bill", phase: "reading" })
    expect(advance(asked).phase).toBe("working")
    expect(advance(advance(asked)).phase).toBe("done")
    expect(advance(advance(advance(asked))).phase).toBe("done")
  })

  it("asking the same question again starts a new run (the effect's key), so it does not stick on reading", () => {
    const done = advance(advance(ask(START, "bill")))
    const again = ask(done, "bill")
    expect(again.phase).toBe("reading")
    expect(again.run).not.toBe(done.run)
    expect(advance(advance(again)).phase).toBe("done")
  })

  it("a different question while working restarts from reading", () => {
    const working = advance(ask(START, "bill"))
    const other = ask(working, "tier")
    expect(other).toMatchObject({ asked: "tier", phase: "reading" })
    expect(other.run).not.toBe(working.run)
  })

  it("idle does not advance on its own", () => {
    expect(advance(START)).toBe(START)
  })
})
