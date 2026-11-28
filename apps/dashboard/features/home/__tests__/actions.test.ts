import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(async () => ({ accessToken: "token" })),
}))
const patchHome = vi.fn()
const patchPreferences = vi.fn()
const acceptInvite = vi.fn()
vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("next-intl/server", () => ({
  getLocale: async () => "vi",
  getTranslations: vi.fn(async () => (key: string) => key),
}))
const redirect = vi.fn()
vi.mock("@/i18n/navigation", () => ({
  redirect: (a: unknown) => redirect(a),
}))
vi.mock("../server", () => ({
  patchHome: (...a: unknown[]) => patchHome(...a),
  patchPreferences: (...a: unknown[]) => patchPreferences(...a),
  acceptInvite: (...a: unknown[]) => acceptInvite(...a),
}))

const { acceptInviteAction, saveHomeSettingsAction } =
  await import("../actions")

describe("saveHomeSettingsAction", () => {
  beforeEach(() => {
    patchHome.mockReset()
    patchPreferences.mockReset()
  })

  it("sends home fields to the home and choices to the account, as typed values", async () => {
    const result = await saveHomeSettingsAction({
      occupants: "3",
      floor_area_m2: "",
      weekly_summary: true,
    })
    expect(result).toEqual({ ok: true })
    expect(patchHome).toHaveBeenCalledWith("token", {
      occupants: 3,
      floor_area_m2: null,
    })
    expect(patchPreferences).toHaveBeenCalledWith("token", {
      weekly_summary: true,
    })
  })

  it("clears the home type with the empty choice", async () => {
    await saveHomeSettingsAction({ home_type: "" })
    expect(patchHome).toHaveBeenCalledWith("token", { home_type: null })
  })

  it("only calls the side that changed", async () => {
    await saveHomeSettingsAction({ notify_tier: false })
    expect(patchHome).not.toHaveBeenCalled()
    expect(patchPreferences).toHaveBeenCalledOnce()
  })

  it("refuses invalid or unknown fields before calling the backend", async () => {
    for (const patch of <Record<string, string>[]>[
      { billing_cycle_day: "29" },
      { occupants: "0" },
      { home_type: "castle" },
      { timezone: "UTC" },
    ]) {
      expect(await saveHomeSettingsAction(patch)).toEqual({
        ok: false,
        error: "invalid",
      })
    }
    expect(patchHome).not.toHaveBeenCalled()
  })

  it("says why the backend refused, and rethrows what it did not expect", async () => {
    patchHome.mockRejectedValueOnce(
      new ApiError(403, "no", { code: "home_owner_required" })
    )
    expect(await saveHomeSettingsAction({ name: "x" })).toEqual({
      ok: false,
      error: "ownerOnly",
    })
    patchHome.mockRejectedValueOnce(new ApiError(503, "down"))
    await expect(saveHomeSettingsAction({ name: "x" })).rejects.toThrow("down")
  })
})

describe("acceptInviteAction", () => {
  beforeEach(() => {
    acceptInvite.mockReset()
    redirect.mockReset()
  })

  it("joins with the trimmed code and opens the dashboard", async () => {
    await acceptInviteAction("  abcdefgh23 ")
    expect(acceptInvite).toHaveBeenCalledWith("token", "abcdefgh23")
    expect(redirect).toHaveBeenCalledWith({ href: "/dashboard", locale: "vi" })
  })

  it("says why a code did not work, and never sends an empty one", async () => {
    expect(await acceptInviteAction("  ")).toEqual({ error: "invite_invalid" })
    expect(acceptInvite).not.toHaveBeenCalled()
    acceptInvite.mockRejectedValueOnce(
      new ApiError(409, "no", { code: "already_has_home" })
    )
    expect(await acceptInviteAction("X")).toEqual({
      error: "already_has_home",
    })
  })
})
