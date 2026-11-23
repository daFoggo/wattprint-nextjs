import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(async () => ({ accessToken: "token" })),
}))
const fetchConversation = vi.fn()
const fetchWatchStatuses = vi.fn()
vi.mock("../server", () => ({
  fetchConversation: (...a: unknown[]) => fetchConversation(...a),
  fetchWatchStatuses: (...a: unknown[]) => fetchWatchStatuses(...a),
}))

const { loadConversationAction } = await import("../actions")

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
})
