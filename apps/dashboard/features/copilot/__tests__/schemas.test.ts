import { afterEach, describe, expect, it, vi } from "vitest"

import { ChatEventSchema, ConversationSchema } from "../schemas"

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

const forecast = {
  kind: "forecast",
  used: 120.5,
  limit: 150,
  kwh: 210,
  vnd: 630000,
}
// One of each kind as stored answers have them (the backend's tests/test_copilot_widgets.py SAMPLES).
const stored = [
  { kind: "devices", slices: [{ id: "d1", label: "Fridge", value: 1.2 }] },
  {
    kind: "compare",
    period: "week",
    data: [{ key: "2026-11-20", current: 9.5, previous: 8 }],
  },
  forecast,
  { kind: "weather", temp: 31, feels: 35, humidity: 70 },
  {
    kind: "plan",
    id: "p1",
    tasks: [{ label: "AC at 26", detail: "..." }],
    kwh: 12,
    vnd: null,
    status: "proposed",
  },
  { kind: "peers", you: 9.1, median: 7.4, days: 30, homes: 12 },
  { kind: "standby", watts: [80, 82], kwh: 59, vnd: 180000 },
  { kind: "links", links: [{ key: "bill", href: "/dashboard/bill" }] },
]
const chart = {
  kind: "chart",
  type: "line",
  title: null,
  labels: ["2026-11-13T00:00:00+07:00", "2026-11-14T00:00:00+07:00"],
  series: [
    { label: "Tổng điện năng cả nhà", unit: null, values: [9.74, null] },
  ],
  columns: ["bucket", "total_kwh"],
  rows: [
    ["2026-11-13T00:00:00+07:00", 9.74],
    ["2026-11-14T00:00:00+07:00", null],
  ],
}

const widgetsOf = (widgets: unknown[]) => {
  const event = done("/dashboard/bill")
  event.data.reply.widgets = widgets as never[]
  const parsed = ChatEventSchema.parse(event)
  return parsed.event === "done" ? parsed.data.reply.widgets : []
}

describe("reply widgets", () => {
  afterEach(() => vi.restoreAllMocks())

  it("keeps old stored widgets", () => {
    expect(widgetsOf(stored)).toEqual(stored)
  })

  it("reads a watch widget", () => {
    const watch = {
      kind: "watch",
      id: "w1",
      label: "Tiền điện kỳ này",
      op: "gt",
      threshold: 1000000,
      unit: "vnd",
      value: 640000,
      ends_at: "2026-11-30T17:00:00Z",
    }
    expect(widgetsOf([watch])).toEqual([watch])
  })

  it("reads a chart widget", () => {
    expect(widgetsOf([chart])).toEqual([chart])
  })

  it("drops only the bad widget", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(
      widgetsOf([{ kind: "alert_card" }, forecast, { ...forecast, used: "x" }])
    ).toEqual([forecast])
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it("drops the bad widget in a stored conversation too", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const reply = {
      ...done("/x").data.reply,
      widgets: [{ kind: "?" }, forecast],
    }
    const c = ConversationSchema.parse({
      id: "c",
      title: null,
      pinned: false,
      updated_at: "2026-11-20T00:00:00+07:00",
      messages: [
        {
          id: "m",
          role: "assistant",
          content: "",
          reply,
          feedback: null,
          created_at: "2026-11-20T00:00:00+07:00",
        },
      ],
    })
    expect(c.messages[0]?.reply?.widgets).toEqual([forecast])
  })
})
