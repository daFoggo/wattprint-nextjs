import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

import { groupOutbound } from "../schemas"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}))
vi.mock("@/lib/dal", () => ({
  requirePermission: async () => ({ accessToken: "t" }),
}))
const apiFetch = vi.fn()
vi.mock("@/lib/http", () => ({ apiFetch }))

const {
  eraseHistoryAction,
  inviteAction,
  setAiDetailAction,
  setMemberDetailAction,
} = await import("../actions")

describe("eraseHistoryAction", () => {
  beforeEach(() => apiFetch.mockReset())

  it("sends the date, and no query only for all", async () => {
    await eraseHistoryAction("2026-11-01")
    await eraseHistoryAction(null)
    expect(apiFetch.mock.calls.map((c) => c[0])).toEqual([
      "/homes/current/history?before=2026-11-01",
      "/homes/current/history",
    ])
  })

  it("never turns a bad date into erasing everything", async () => {
    await expect(eraseHistoryAction("")).rejects.toThrow()
    await expect(eraseHistoryAction(undefined as never)).rejects.toThrow()
    expect(apiFetch).not.toHaveBeenCalled()
  })
})

describe("setAiDetailAction", () => {
  beforeEach(() => apiFetch.mockReset())

  it("sends the level as ai_detail", async () => {
    await setAiDetailAction("daily")
    expect(JSON.parse(apiFetch.mock.calls[0]![1].body)).toEqual({
      ai_detail: "daily",
    })
  })

  it("says why the backend refused", async () => {
    for (const [code, key] of [
      ["demo_home_read_only", "demo"],
      ["home_owner_required", "owner"],
      ["home_read_only", "other"],
    ]) {
      apiFetch.mockRejectedValueOnce(new ApiError(403, "no", { code }))
      expect(await setAiDetailAction("daily")).toEqual({
        ok: false,
        error: key,
      })
    }
  })
})

describe("members", () => {
  beforeEach(() => apiFetch.mockReset())

  it("hands back the one-time code", async () => {
    apiFetch.mockResolvedValueOnce({
      code: "ABCDEFGH23",
      expires_at: "2026-12-05T00:00:00Z",
    })
    expect(await inviteAction()).toEqual({ ok: true, code: "ABCDEFGH23" })
  })

  it("never sends a made-up member id into the path", async () => {
    await expect(setMemberDetailAction("../history", "full")).rejects.toThrow()
    expect(apiFetch).not.toHaveBeenCalled()
  })
})

describe("groupOutbound", () => {
  const row = (created_at: string, party = "openrouter") => ({
    created_at,
    party,
    purpose: "wappi",
    data: ["question"],
    detail: null,
  })

  it("counts calls per local day and receiver", () => {
    // 17:30 UTC is already the next day in Vietnam.
    const groups = groupOutbound([
      row("2026-11-27T17:30:00Z"),
      row("2026-11-27T17:10:00Z"),
      row("2026-11-27T16:00:00Z"),
      row("2026-11-27T15:00:00Z", "astralx"),
    ])
    expect(groups.map((g) => [g.day, g.party, g.count])).toEqual([
      ["2026-11-28", "openrouter", 2],
      ["2026-11-27", "openrouter", 1],
      ["2026-11-27", "astralx", 1],
    ])
  })
})
