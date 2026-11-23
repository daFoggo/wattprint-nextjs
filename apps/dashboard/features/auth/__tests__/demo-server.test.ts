import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@workspace/auth/config", () => ({
  authConfig: { KEYCLOAK_CLIENT_SECRET: "web-secret" },
}))
let incoming = new Headers()
vi.mock("next/headers", () => ({ headers: async () => incoming }))
const apiFetch = vi.fn()
vi.mock("@/lib/http", () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
}))

const { createDemoSession } = await import("../server")

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

describe("createDemoSession", () => {
  beforeEach(() => {
    apiFetch.mockReset().mockResolvedValue(tokens)
  })

  it("sends our client secret and the address nginx saw", async () => {
    incoming = new Headers({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1",
    })
    await expect(createDemoSession("2")).resolves.toEqual(tokens)
    expect(apiFetch.mock.calls[0]![0]).toBe("/demo/session")
    expect(sent()["X-Demo-Secret"]).toBe("web-secret")
    expect(sent()["X-Demo-Visitor"]).toBe("203.0.113.7")
  })

  it("falls back to the first X-Forwarded-For entry, then to none", async () => {
    incoming = new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.2" })
    await createDemoSession("2")
    expect(sent()["X-Demo-Visitor"]).toBe("198.51.100.1")
    apiFetch.mockClear()
    incoming = new Headers()
    await createDemoSession("2")
    expect(sent()["X-Demo-Visitor"]).toBe("")
  })
})
