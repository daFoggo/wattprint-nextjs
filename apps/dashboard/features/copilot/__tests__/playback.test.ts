import { describe, expect, it } from "vitest"

import { detectIntent } from "../demo"
import {
  advance,
  playLength,
  segments,
  tokens,
  type AssistantMessage,
} from "../playback"
import type { Reply } from "../schemas"

const reply: Reply = {
  intent: "devices",
  tier: "estimated",
  steps: [
    { label: "a", detail: "" },
    { label: "b", detail: "" },
  ],
  text: "Tủ lạnh dùng nhiều nhất [1]. Xem thêm [2] [9].",
  sources: [
    { title: "One", url: "https://one.example" },
    { title: "Two", url: "https://two.example" },
  ],
  widgets: [],
  followUps: [],
}
const message: AssistantMessage = {
  id: "m",
  role: "assistant",
  reply,
  phase: "thinking",
  steps: 0,
  words: 0,
}

describe("advance", () => {
  it("thinks, then reveals one step at a time, then the words, then settles", () => {
    expect(advance(message, 100).phase).toBe("thinking")
    expect(advance(message, 800)).toMatchObject({ phase: "working", steps: 0 })
    expect(advance(message, 1400)).toMatchObject({ phase: "working", steps: 1 })
    expect(advance(message, 1900)).toMatchObject({
      phase: "streaming",
      steps: 2,
    })
    const done = advance(message, playLength(reply))
    expect(done).toMatchObject({
      phase: "done",
      words: tokens(reply.text).length,
    })
  })
})

describe("segments", () => {
  it("turns [n] into citations and drops unknown ones", () => {
    expect(segments(reply, 99)).toEqual([
      "Tủ lạnh dùng nhiều nhất ",
      { type: "citation", label: "One", href: "https://one.example" },
      ". Xem thêm ",
      { type: "citation", label: "Two", href: "https://two.example" },
      " ",
      ".",
    ])
  })
  it("shows only the words revealed so far", () => {
    expect(segments(reply, 2)).toEqual(["Tủ lạnh "])
  })
})

describe("detectIntent", () => {
  it.each([
    ["Thiết bị nào tốn điện nhất?", "devices"],
    ["vi sao tien dien ky nay cao", "bill"],
    ["Cuối kỳ mình sẽ trả bao nhiêu?", "forecast"],
    ["Dự báo tiền điện tháng này", "forecast"],
    ["Hôm nay nóng quá", "weather"],
    ["Lập giúp mình kế hoạch tiết kiệm", "plan"],
    ["So sánh nhà mình với các hộ khác", "peers"],
    ["Điện nền là gì?", "standby"],
    ["Make me a savings plan", "plan"],
    ["xin chào", "clarify"],
  ])("%s → %s", (text, intent) => {
    expect(detectIntent(text)).toBe(intent)
  })
})
