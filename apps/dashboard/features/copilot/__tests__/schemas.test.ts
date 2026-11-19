import { describe, expect, it } from "vitest"

import { ChatEventSchema } from "../schemas"

const done = (url: string) => ({
  event: "done",
  data: {
    message_id: "m",
    reply: {
      intent: "bill",
      tier: "measured",
      steps: [],
      sql: null,
      text: "",
      sources: [{ title: "s", url }],
      widgets: [],
      followUps: [],
    },
  },
})

describe("reply sources", () => {
  it("link only to web pages and the app's own paths", () => {
    expect(
      ChatEventSchema.safeParse(done("https://evn.com.vn/x")).success
    ).toBe(true)
    expect(ChatEventSchema.safeParse(done("/dashboard/bill")).success).toBe(
      true
    )
    expect(ChatEventSchema.safeParse(done("javascript:alert(1)")).success).toBe(
      false
    )
    expect(ChatEventSchema.safeParse(done("//evil.example")).success).toBe(
      false
    )
  })
})
