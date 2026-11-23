import { beforeEach, describe, expect, it, vi } from "vitest"

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
vi.mock("@/lib/dal", () => ({ SESSION_TAG: "session" }))
vi.mock("@/lib/env.public", () => ({ publicEnv: {} }))
const signInWithTokens = vi.fn()
vi.mock("@/lib/auth", () => ({
  getAuthProvider: async () => ({ signInWithTokens }),
}))
const createDemoSession = vi.fn()
const fetchDemoHomes = vi.fn()
vi.mock("../server", () => ({
  createDemoSession: (...a: unknown[]) => createDemoSession(...a),
  fetchDemoHomes: () => fetchDemoHomes(),
}))

const { signInAsDemoHomeAction } = await import("../actions")
const { getDemoHomes } = await import("../queries")

const tokens = {
  access_token: "a",
  refresh_token: "r",
  id_token: "i",
  expires_in: 300,
  refresh_expires_in: 1800,
}

describe("signInAsDemoHomeAction", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    for (const f of [signInWithTokens, createDemoSession, redirect])
      f.mockClear()
  })

  it("stores the backend's tokens, then goes to the dashboard", async () => {
    createDemoSession.mockResolvedValue(tokens)
    await expect(signInAsDemoHomeAction("2")).rejects.toThrow(
      "NEXT_REDIRECT /dashboard"
    )
    expect(createDemoSession).toHaveBeenCalledWith("2")
    expect(signInWithTokens).toHaveBeenCalledWith(tokens)
  })

  it("returns the error and stores nothing when the backend refuses", async () => {
    createDemoSession.mockRejectedValue(new Error("503"))
    await expect(signInAsDemoHomeAction("2")).resolves.toEqual({
      error: "failed",
    })
    expect(signInWithTokens).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it("returns the error when the tokens are not valid for this app", async () => {
    createDemoSession.mockResolvedValue(tokens)
    signInWithTokens.mockRejectedValueOnce(new Error("rejected"))
    await expect(signInAsDemoHomeAction("2")).resolves.toEqual({
      error: "failed",
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it("refuses a malformed house before calling the backend", async () => {
    for (const house of ["", "x".repeat(33)])
      await expect(signInAsDemoHomeAction(house)).resolves.toEqual({
        error: "failed",
      })
    expect(createDemoSession).not.toHaveBeenCalled()
  })
})

describe("getDemoHomes", () => {
  it("is empty when the backend is down, so sign-in still renders", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    fetchDemoHomes.mockRejectedValue(new Error("ECONNREFUSED"))
    await expect(getDemoHomes()).resolves.toEqual([])
  })
})
