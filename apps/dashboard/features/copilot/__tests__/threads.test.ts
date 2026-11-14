import { describe, expect, it } from "vitest"

import type { Message, Phase, Reply, Thread } from "../schemas"
import { addTurn, statusOf, stopLive, updateMessage } from "../threads"

const reply: Reply = {
  intent: "bill",
  tier: "measured",
  steps: [],
  text: "x",
  sources: [],
  widgets: [],
  followUps: [],
}
const answer = (id: string, phase: Phase): Message => ({
  id,
  role: "assistant",
  reply,
  phase,
  steps: 0,
  words: 0,
})
const question = (id: string, text = "q") =>
  ({ id, role: "user", text }) as const
const thread = (id: string, ...messages: Message[]): Thread => ({
  id,
  messages,
})

describe("statusOf", () => {
  it("is ready with no thread, or once the answer is done or stopped", () => {
    expect(statusOf()).toBe("ready")
    expect(statusOf(thread("t", answer("a", "done")))).toBe("ready")
    expect(statusOf(thread("t", answer("a", "stopped")))).toBe("ready")
  })
  it("is submitted while thinking or using tools, streaming while writing", () => {
    expect(statusOf(thread("t", answer("a", "thinking")))).toBe("submitted")
    expect(statusOf(thread("t", answer("a", "working")))).toBe("submitted")
    expect(statusOf(thread("t", answer("a", "streaming")))).toBe("streaming")
  })
})

describe("stopLive", () => {
  it("stops only the answers still playing and keeps untouched threads as they were", () => {
    const quiet = thread("q", answer("a", "done"))
    const busy = thread("b", answer("a", "done"), answer("c", "streaming"))
    const [q, b] = stopLive([quiet, busy])
    expect(q).toBe(quiet)
    expect(b?.messages.map((m) => m.role === "assistant" && m.phase)).toEqual([
      "done",
      "stopped",
    ])
  })
})

describe("addTurn", () => {
  it("starts a new thread first, titled by the question", () => {
    const old = thread("old")
    const [first, second] = addTurn(
      [old],
      "new",
      [question("q", "Vì sao?"), answer("a", "thinking")],
      5
    )
    expect(first).toMatchObject({ id: "new", title: "Vì sao?", updatedAt: 5 })
    expect(first?.messages).toHaveLength(2)
    expect(second).toBe(old)
  })
  it("appends to an existing thread and bumps its time", () => {
    const [t] = addTurn(
      [thread("t", question("q0"))],
      "t",
      [question("q1"), answer("a1", "thinking")],
      9
    )
    expect(t?.updatedAt).toBe(9)
    expect(t?.messages.map((m) => m.id)).toEqual(["q0", "q1", "a1"])
  })
  it("after stopLive, a question asked mid-answer stops that answer and still lands", () => {
    const busy = [thread("t", question("q0"), answer("a0", "working"))]
    const [t] = addTurn(
      stopLive(busy),
      "t",
      [question("q1"), answer("a1", "thinking")],
      1
    )
    expect(statusOf(t)).toBe("submitted")
    expect(t?.messages[1]).toMatchObject({ id: "a0", phase: "stopped" })
  })
})

describe("updateMessage", () => {
  it("changes one message of one thread", () => {
    const [a, b] = updateMessage(
      [thread("a", question("m", "x")), thread("b", question("m", "x"))],
      "b",
      "m",
      (m) => ({ ...m, text: "y" }) as Message
    )
    expect(a?.messages[0]).toMatchObject({ text: "x" })
    expect(b?.messages[0]).toMatchObject({ text: "y" })
  })
})
