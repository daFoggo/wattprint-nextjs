import { describe, expect, it } from "vitest"

import { isWatched } from "../schemas"

describe("isWatched", () => {
  it("keeps the watches the alerts page lists", () => {
    expect(isWatched({ status: "active" })).toBe(true)
    expect(isWatched({ status: "broken" })).toBe(true)
  })

  it("drops ended watches, which have no row to link to", () => {
    expect(isWatched({ status: "fired" })).toBe(false)
    expect(isWatched({ status: "cancelled" })).toBe(false)
  })
})
