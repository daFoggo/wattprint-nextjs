import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock("@/lib/http", () => ({ apiFetch, apiResponse: vi.fn() }))

import en from "@/messages/en/copilot.json"
import vi_ from "@/messages/vi/copilot.json"

import { sentKey } from "../sent"
import { fetchConsents, putConsent, putFeedback } from "../server"

const body = () => JSON.parse(apiFetch.mock.calls.at(-1)![1].body)

describe("consents and feedback", () => {
  beforeEach(() => apiFetch.mockReset())

  it("shares an answer's content only when asked to", async () => {
    await putFeedback("t", "m", "down")
    expect(body()).toEqual({ value: "down", share_content: false })
    await putFeedback("t", "m", "down", true)
    expect(body()).toEqual({ value: "down", share_content: true })
  })

  it("reads and writes consents by purpose", async () => {
    const row = {
      purpose: "voice",
      granted: true,
      version: "1",
      at: null,
      current_version: "1",
    }
    apiFetch.mockResolvedValueOnce([row])
    expect(await fetchConsents("t")).toEqual([
      { purpose: "voice", granted: true },
    ])
    apiFetch.mockResolvedValueOnce({ ...row, granted: false })
    await putConsent("t", "voice", false)
    expect(apiFetch.mock.calls.at(-1)![0]).toBe("/users/me/consents/voice")
    expect(body()).toEqual({ granted: false })
  })
})

describe("what was sent", () => {
  it("has words in both languages for every id the backend sends", () => {
    const parties = [
      "openrouter",
      "astralx",
      "openweather",
      "telegram",
      "smtp",
    ]
    const kinds = [
      "question",
      "conversation",
      "tool results",
      "home numbers",
      "voice recording",
      "answer text",
      "province location",
      "rating",
      "answer",
      "email address",
      "alert",
      "weekly summary",
    ]
    for (const { sent } of [vi_, en]) {
      for (const id of parties) expect(sent.parties).toHaveProperty(id)
      for (const id of kinds) expect(sent.kinds).toHaveProperty(sentKey(id))
    }
  })
})
