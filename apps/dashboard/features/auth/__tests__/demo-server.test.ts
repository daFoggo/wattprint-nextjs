import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const apiFetch = vi.fn()
vi.mock("@/lib/http", () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
}))

const { viewDemoHome } = await import("../server")

describe("viewDemoHome", () => {
  it("posts with the account's token, the key escaped into the path", async () => {
    apiFetch.mockResolvedValue({})
    await viewDemoHome("token", "5-heat/../x")
    expect(apiFetch).toHaveBeenCalledWith("/demo/homes/5-heat%2F..%2Fx/view", {
      token: "token",
      method: "POST",
    })
  })
})
