import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), refresh: vi.fn() }))
vi.mock("next/headers", () => ({ cookies: async () => ({}) }))
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
const signOut = vi.fn(async () => "https://auth.example/logout")
vi.mock("@/lib/auth", () => ({ getAuthProvider: async () => ({ signOut }) }))
const deleteAccount = vi.fn()
vi.mock("../server", () => ({
  deleteAccount: (...a: unknown[]) => deleteAccount(...a),
}))

const { deleteAccountAction } = await import("../actions")

describe("deleteAccountAction", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    for (const f of [deleteAccount, signOut, redirect]) f.mockClear()
  })

  it("deletes the account, clears the session and lands on sign-in", async () => {
    deleteAccount.mockResolvedValue(undefined)
    await expect(deleteAccountAction()).rejects.toThrow(
      "NEXT_REDIRECT /sign-in"
    )
    expect(deleteAccount).toHaveBeenCalledWith("token")
    expect(signOut).toHaveBeenCalledOnce()
  })

  it("says why when other people belong to the home, and keeps the session", async () => {
    deleteAccount.mockRejectedValue(
      new ApiError(409, "Conflict", { code: "home_has_members" })
    )
    expect(await deleteAccountAction()).toEqual({
      error: "deleteAccount.homeHasMembers",
    })
    expect(signOut).not.toHaveBeenCalled()
  })

  it("asks to try again when the backend or Keycloak could not finish", async () => {
    deleteAccount.mockRejectedValue(
      new ApiError(503, "Unavailable", { code: "account_delete_unavailable" })
    )
    expect(await deleteAccountAction()).toEqual({
      error: "deleteAccount.unavailable",
    })
    expect(signOut).not.toHaveBeenCalled()
  })

  it("lets an unexpected failure through", async () => {
    deleteAccount.mockRejectedValue(new Error("boom"))
    await expect(deleteAccountAction()).rejects.toThrow("boom")
  })
})
