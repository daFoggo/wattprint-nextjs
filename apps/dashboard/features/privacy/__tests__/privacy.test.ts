import { beforeEach, describe, expect, it, vi } from "vitest"

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

const { eraseHistoryAction } = await import("../actions")

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
