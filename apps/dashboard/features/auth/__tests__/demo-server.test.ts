import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/dal", () => ({ demoGuestSecret: () => "web-secret" }))
let incoming = new Headers()
vi.mock("next/headers", () => ({ headers: async () => incoming }))
const apiFetch = vi.fn()
vi.mock("@/lib/http", () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
}))

const { createDemoGuest, viewDemoHome } = await import("../server")

const tokens = {
  access_token: "a",
  refresh_token: "r",
  id_token: "i",
  expires_in: 300,
  refresh_expires_in: 1800,
}

function sent() {
  return apiFetch.mock.calls[0]![1].headers as Record<string, string>
}

describe("viewDemoHome", () => {
  it("posts with the account's token, the key escaped into the path", async () => {
    apiFetch.mockReset().mockResolvedValue({})
    await viewDemoHome("token", "5-heat/../x")
    expect(apiFetch).toHaveBeenCalledWith("/demo/homes/5-heat%2F..%2Fx/view", {
      token: "token",
      method: "POST",
    })
  })
})

describe("createDemoGuest", () => {
  beforeEach(() => {
    apiFetch.mockReset().mockResolvedValue(tokens)
  })

  it("sends our client secret and the address nginx saw, the key escaped", async () => {
    incoming = new Headers({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1",
    })
    await expect(createDemoGuest("5-heat/x")).resolves.toEqual(tokens)
    expect(apiFetch.mock.calls[0]![0]).toBe("/demo/homes/5-heat%2Fx/guest")
    expect(apiFetch.mock.calls[0]![1].method).toBe("POST")
    expect(sent()["X-Demo-Secret"]).toBe("web-secret")
    expect(sent()["X-Demo-Visitor"]).toBe("203.0.113.7")
  })

  it("falls back to the first X-Forwarded-For entry, then to none", async () => {
    incoming = new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.2" })
    await createDemoGuest("2")
    expect(sent()["X-Demo-Visitor"]).toBe("198.51.100.1")
    apiFetch.mockClear()
    incoming = new Headers()
    await createDemoGuest("2")
    expect(sent()["X-Demo-Visitor"]).toBe("")
  })
})
