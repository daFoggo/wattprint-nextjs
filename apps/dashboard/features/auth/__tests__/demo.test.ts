import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ updateTag: vi.fn() }))
vi.mock("next/headers", () => ({ cookies: vi.fn() }))
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
vi.mock("@/lib/env.public", () => ({ publicEnv: {} }))
vi.mock("@/lib/auth", () => ({ getAuthProvider: async () => ({}) }))
const viewDemoHome = vi.fn()
const fetchDemoHomes = vi.fn()
vi.mock("../server", () => ({
  viewDemoHome: (...a: unknown[]) => viewDemoHome(...a),
  fetchDemoHomes: () => fetchDemoHomes(),
}))

const { viewDemoHomeAction } = await import("../actions")
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

describe("getDemoHomes", () => {
  it("is empty when the backend is down, so sign-in still renders", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    fetchDemoHomes.mockRejectedValue(new Error("ECONNREFUSED"))
    await expect(getDemoHomes()).resolves.toEqual([])
  })
})
