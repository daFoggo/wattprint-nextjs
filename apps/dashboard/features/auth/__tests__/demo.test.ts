import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  refresh: vi.fn(),
  cacheLife: vi.fn(),
  io: async () => {},
}))
const jar = { set: vi.fn(), delete: vi.fn(), get: vi.fn() }
vi.mock("next/headers", () => ({ cookies: async () => jar }))
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "vi"),
  getTranslations: vi.fn(async () => (key: string) => key),
}))
// redirect() throws in Next; the action must let it through, not report it as a failure.
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`)
})
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }))
vi.mock("@/i18n/navigation", () => ({
  getPathname: ({ href }: { href: string }) => href,
}))
vi.mock("@/lib/dal", () => ({
  SESSION_TAG: "session",
  requirePermission: async () => ({ accessToken: "token" }),
}))
vi.mock("@/lib/env.public", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://wattprint.example" },
}))
const start = vi.fn(async () => "https://auth.example/login")
const signInWithTokens = vi.fn()
vi.mock("@/lib/auth", () => ({
  getAuthProvider: async () => ({
    oauth: { start },
    signInWithTokens,
    isExpectedError: () => false,
  }),
}))
const viewDemoHome = vi.fn()
const fetchDemoHomes = vi.fn()
const createDemoGuest = vi.fn()
vi.mock("../server", () => ({
  viewDemoHome: (...a: unknown[]) => viewDemoHome(...a),
  fetchDemoHomes: () => fetchDemoHomes(),
  createDemoGuest: (...a: unknown[]) => createDemoGuest(...a),
}))

const { startDemoAction, viewDemoHomeAction } = await import("../actions")
const { getDemoHomes } = await import("../queries")

describe("viewDemoHomeAction", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    for (const f of [viewDemoHome, redirect]) f.mockClear()
  })

  it("makes the account a viewer of the home, then opens the dashboard", async () => {
    viewDemoHome.mockResolvedValue(undefined)
    await expect(viewDemoHomeAction("2")).rejects.toThrow(
      "NEXT_REDIRECT /dashboard"
    )
    expect(viewDemoHome).toHaveBeenCalledWith("token", "2")
  })

  it("says why when the account already belongs to a home", async () => {
    viewDemoHome.mockRejectedValue(
      new ApiError(409, "Conflict", { code: "demo_not_for_members" })
    )
    await expect(viewDemoHomeAction("2")).resolves.toEqual({
      error: "notForMembers",
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it("returns the error when the backend refuses otherwise", async () => {
    viewDemoHome.mockRejectedValue(new ApiError(404, "Not Found", {}))
    await expect(viewDemoHomeAction("2")).resolves.toEqual({ error: "failed" })
  })

  it("refuses a malformed key before calling the backend", async () => {
    for (const key of ["", "x".repeat(33)])
      await expect(viewDemoHomeAction(key)).resolves.toEqual({
        error: "failed",
      })
    expect(viewDemoHome).not.toHaveBeenCalled()
  })
})

describe("startDemoAction", () => {
  const tokens = { access_token: "a", refresh_token: "r", id_token: "i" }
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    for (const f of [createDemoGuest, signInWithTokens, redirect]) f.mockReset()
    redirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT ${url}`)
    })
  })

  it("signs a new guest in with the backend's tokens, then opens the dashboard", async () => {
    createDemoGuest.mockResolvedValue(tokens)
    await expect(startDemoAction("2")).rejects.toThrow(
      "NEXT_REDIRECT /dashboard"
    )
    expect(createDemoGuest).toHaveBeenCalledWith("2")
    expect(signInWithTokens).toHaveBeenCalledWith(tokens)
  })

  it("says the demo is busy when the backend caps guests", async () => {
    for (const status of [429, 503]) {
      createDemoGuest.mockRejectedValue(new ApiError(status, "x", {}))
      await expect(startDemoAction("2")).resolves.toEqual({ error: "busy" })
    }
    expect(signInWithTokens).not.toHaveBeenCalled()
  })

  it("returns a message, signed out, when the guest cannot be made or its token is refused", async () => {
    createDemoGuest.mockRejectedValue(new ApiError(404, "x", {}))
    await expect(startDemoAction("2")).resolves.toEqual({ error: "failed" })
    createDemoGuest.mockResolvedValue(tokens)
    signInWithTokens.mockRejectedValue(new Error("Keycloak token rejected"))
    await expect(startDemoAction("2")).resolves.toEqual({ error: "failed" })
    expect(redirect).not.toHaveBeenCalled()
  })

  it("refuses a malformed key before calling the backend", async () => {
    await expect(startDemoAction("x".repeat(33))).resolves.toEqual({
      error: "failed",
    })
    expect(createDemoGuest).not.toHaveBeenCalled()
  })
})

describe("getDemoHomes", () => {
  it("is empty when the backend is down, so sign-in still renders", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    fetchDemoHomes.mockRejectedValue(new Error("ECONNREFUSED"))
    await expect(getDemoHomes()).resolves.toEqual([])
  })
})
