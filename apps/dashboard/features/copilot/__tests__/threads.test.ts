import { describe, expect, it } from "vitest"

import type { Reply, Thread } from "../schemas"
import {
  addTurn,
  applyEvent,
  statusOf,
  stopLive,
  type AssistantMessage,
} from "../threads"

const answer = (phase: AssistantMessage["phase"]): AssistantMessage => ({
  id: "a",
  role: "assistant",
  phase,
  steps: [],
  text: "",
  feedback: null,
  startedAt: 1000,
})

const reply: Reply = {
  intent: "bill",
  tier: "measured",
  steps: [{ label: "Tính hoá đơn", detail: "tb_bill" }],
  sql: null,
  text: "Kỳ này 10 kWh [1].",
  sources: [{ title: "EVN", url: "https://evn.com.vn" }],
  widgets: [],
  followUps: [],
}

describe("applyEvent", () => {
  it("follows a stream from the first step to the stored reply", () => {
    let m = answer("thinking")
    m = applyEvent(
      m,
      { event: "meta", data: { conversation_id: "c", message_id: "m1" } },
      1100
    )
    m = applyEvent(m, { event: "step", data: reply.steps[0]! }, 1200)
    expect([m.id, m.phase, m.steps.length]).toEqual(["m1", "working", 1])
    m = applyEvent(m, { event: "token", data: { text: "Kỳ này " } }, 1300)
    m = applyEvent(m, { event: "token", data: { text: "10 kWh" } }, 1400)
    expect([m.phase, m.text]).toEqual(["streaming", "Kỳ này 10 kWh"])
    m = applyEvent(
      m,
      { event: "done", data: { message_id: "m1", reply } },
      3000
    )
    expect([m.phase, m.text, m.duration, m.reply]).toEqual([
      "done",
      reply.text,
      2000,
      reply,
    ])
  })

  it("keeps what the tools found when the answer fails", () => {
    const m = applyEvent(
      answer("working"),
      {
        event: "error",
        data: { code: "copilot_unavailable", message: "x", reply },
      },
      2000
    )
    expect([m.phase, m.error, m.reply]).toEqual([
      "error",
      "copilot_unavailable",
      reply,
    ])
  })
})

describe("threads", () => {
  const thread = (messages: AssistantMessage[]): Thread => ({
    id: "t",
    updatedAt: 0,
    messages,
  })

  it("is busy while an answer is live", () => {
    expect(statusOf(thread([answer("thinking")]))).toBe("submitted")
    expect(statusOf(thread([answer("streaming")]))).toBe("streaming")
    expect(statusOf(thread([answer("done")]))).toBe("ready")
    // Being fetched: busy, so a question cannot be overwritten when the messages land.
    expect(statusOf({ id: "t", updatedAt: 0 })).toBe("submitted")
    expect(statusOf({ id: "t", updatedAt: 0, failed: true })).toBe("ready")
  })

  it("stops live answers where they stand", () => {
    const [t] = stopLive([thread([answer("streaming"), answer("done")])])
    expect(t!.messages!.map((m) => (m as AssistantMessage).phase)).toEqual([
      "stopped",
      "done",
    ])
  })

  it("puts a new conversation first, titled by its question", () => {
    const old: Thread = { id: "old", updatedAt: 0, messages: [] }
    const next = addTurn(
      [old],
      "new",
      [{ id: "q", role: "user", text: "Hỏi" }, answer("thinking")],
      5
    )
    expect(next.map((t) => [t.id, t.title, t.updatedAt])).toEqual([
      ["new", "Hỏi", 5],
      ["old", undefined, 0],
    ])
  })
})
