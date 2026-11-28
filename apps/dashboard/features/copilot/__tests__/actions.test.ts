import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(async () => ({ accessToken: "token" })),
}))
const fetchConversation = vi.fn()
const fetchWatchStatuses = vi.fn()
const putFeedback = vi.fn()
const putConsent = vi.fn()
vi.mock("../server", () => ({
  putFeedback: (...a: unknown[]) => putFeedback(...a),
  putConsent: (...a: unknown[]) => putConsent(...a),
  fetchConversation: (...a: unknown[]) => fetchConversation(...a),
  fetchWatchStatuses: (...a: unknown[]) => fetchWatchStatuses(...a),
}))

const { loadConversationAction, rateAnswerAction, setConsentAction } =
  await import("../actions")

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"
const watch = {
  kind: "watch",
  id: "w1",
  label: "Tiền điện",
  op: "gt",
  threshold: 1,
  unit: "vnd",
  value: null,
  ends_at: "2026-11-30T17:00:00Z",
}
const conversation = (widgets: unknown[]) => ({
  id: ID,
  messages: [
    {
      id: "m",
      role: "assistant",
      content: "",
      feedback: null,
      reply: {
        intent: "x",
        tier: "measured",
        steps: [],
        sql: null,
        text: "",
        sources: [],
        widgets,
        followUps: [],
      },
    },
  ],
})

const widgetsOf = (messages: Awaited<ReturnType<typeof loadConversationAction>>) => {
  const m = messages[0]
  return m?.role === "assistant" ? m.reply?.widgets : undefined
}

describe("loadConversationAction", () => {
  beforeEach(() => {
    fetchConversation.mockReset()
    fetchWatchStatuses.mockReset()
  })

  it("reads watch statuses only when the chat holds a watch widget", async () => {
    fetchConversation.mockResolvedValue(conversation([]))
    await loadConversationAction(ID)
    expect(fetchWatchStatuses).not.toHaveBeenCalled()
  })

  it("marks a watch widget whose watch has ended", async () => {
    fetchConversation.mockResolvedValue(conversation([watch]))
    fetchWatchStatuses.mockResolvedValue([{ id: "w1", status: "expired" }])
    const messages = await loadConversationAction(ID)
    expect(fetchWatchStatuses).toHaveBeenCalledWith("token")
    expect(widgetsOf(messages)).toEqual([{ ...watch, ended: true }])
  })

  it("still opens the chat when the watch statuses cannot be read", async () => {
    fetchConversation.mockResolvedValue(conversation([watch]))
    fetchWatchStatuses.mockRejectedValue(new Error("alerts down"))
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const messages = await loadConversationAction(ID)
    expect(widgetsOf(messages)).toEqual([watch]) // shown as live, without the "Ended" mark
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})

describe("what an action lets out", () => {
  it("shares an answer's content on a true boolean only", async () => {
    await rateAnswerAction(ID, "down", "false" as unknown as boolean)
    expect(putFeedback).toHaveBeenLastCalledWith("token", ID, "down", false)
    await rateAnswerAction(ID, "down", true)
    expect(putFeedback).toHaveBeenLastCalledWith("token", ID, "down", true)
  })

  it("refuses an unknown purpose or a non-boolean consent", async () => {
    await expect(setConsentAction("sms" as "voice", true)).rejects.toThrow()
    await expect(
      setConsentAction("voice", "yes" as unknown as boolean)
    ).rejects.toThrow()
    expect(putConsent).not.toHaveBeenCalled()
  })
})
