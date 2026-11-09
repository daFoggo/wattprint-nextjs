import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseServerEnv } from "../env"

describe("parseServerEnv", () => {
  it("defaults API_BASE_URL to the local FastAPI", () => {
    expect(parseServerEnv({}).API_BASE_URL).toBe("http://localhost:8000")
  })

  it("treats an empty variable as unset", () => {
    expect(parseServerEnv({ API_BASE_URL: "" }).API_BASE_URL).toBe(
      "http://localhost:8000"
    )
  })

  it("rejects a malformed URL", () => {
    expect(() => parseServerEnv({ API_BASE_URL: "nope" })).toThrow()
  })
})
