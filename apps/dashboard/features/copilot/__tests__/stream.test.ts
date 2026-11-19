import { describe, expect, it } from "vitest"

import { chatEvents } from "../stream"

const body = (...pieces: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of pieces) c.enqueue(new TextEncoder().encode(p))
      c.close()
    },
  })

describe("chatEvents", () => {
  it("parses events split anywhere, skipping comments", async () => {
    const events = []
    for await (const e of chatEvents(
      body(
        ": ping\n\nevent: token\nda",
        'ta: {"text": "Kỳ "}\n\nevent: token\ndata: {"text": "này"}\n',
        '\nevent: step\ndata: {"label": "a", "detail": "b"}\n\n'
      )
    ))
      events.push(e)
    expect(events).toEqual([
      { event: "token", data: { text: "Kỳ " } },
      { event: "token", data: { text: "này" } },
      { event: "step", data: { label: "a", detail: "b" } },
    ])
  })

  it("fails loudly on an event the client does not know", async () => {
    const read = async () => {
      for await (const _ of chatEvents(
        body('event: token\ndata: {"txt": 1}\n\n')
      ))
        void _
    }
    await expect(read()).rejects.toThrow()
  })
})
