import { z } from "zod"

import { DEVICE_ADVICE } from "@/config/advice"

// The copilot API's shapes (wattprint-backend app/modules/copilot): the reply and the stream are
// parsed with these on the client too, so a change on either side fails loudly.

/** Data tiering (hồ sơ §4.2): every answer says how its figures were obtained. */
const DataTierSchema = z.enum(["measured", "document", "estimated", "inferred"])
export type DataTier = z.infer<typeof DataTierSchema>

const StepSchema = z.object({
  /** The backend tool behind the step (absent on answers stored before it was sent). */
  tool: z.string().optional(),
  label: z.string(),
  detail: z.string(),
})
type Step = z.infer<typeof StepSchema>

/** A citation: an http(s) page or one of the app's own paths, nothing a link could run. */
const SourceSchema = z.object({
  title: z.string(),
  url: z.string().regex(/^(https?:\/\/|\/(?!\/))/),
})

/** Charts under an answer, built by the backend from the tools' results (never written by the model). */
const WidgetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("devices"),
    slices: z.array(
      z.object({ id: z.string(), label: z.string(), value: z.number() })
    ),
  }),
  z.object({
    kind: z.literal("compare"),
    period: z.enum(["week", "cycle"]),
    /** `key` is the current period's day (yyyy-mm-dd); `previous` the same day of the period before. */
    data: z.array(
      z.object({ key: z.string(), current: z.number(), previous: z.number() })
    ),
  }),
  z.object({
    kind: z.literal("forecast"),
    used: z.number(),
    /** The next tier's start, or the top of the current one; null in the last tier. */
    limit: z.number().nullable(),
    kwh: z.number(),
    vnd: z.number(),
  }),
  z.object({
    kind: z.literal("weather"),
    temp: z.number(),
    feels: z.number(),
    humidity: z.number(),
  }),
  /** Up to three of the device advice; `id` (`<deviceId>.<key>`) is the plan page's `?add=`. Older plans (a 14-day trial) no longer parse and drop. */
  z.object({
    kind: z.literal("plan"),
    actions: z.array(
      z.object({
        id: z.string(),
        key: z.enum(DEVICE_ADVICE),
        device: z.string(),
        params: z.record(z.string(), z.number()),
        kwh: z.number(),
        vnd: z.number(),
      })
    ),
    kwh: z.number(),
    /** Each action's saving summed; the plan page prices them together. */
    vnd: z.number(),
  }),
  z.object({
    kind: z.literal("peers"),
    you: z.number(),
    median: z.number(),
    days: z.number(),
    homes: z.number(),
  }),
  z.object({
    kind: z.literal("standby"),
    watts: z.array(z.number()),
    kwh: z.number(),
    vnd: z.number().nullable(),
  }),
  z.object({
    kind: z.literal("links"),
    links: z.array(
      z.object({
        key: z.enum(["devices", "bill", "statistics", "settings"]),
        href: z.string(),
      })
    ),
  }),
  /** A text2sql result: drawn as `type`, or a table (`columns`, `rows`) when it cannot be drawn as is. */
  z.object({
    kind: z.literal("chart"),
    type: z.enum(["line", "area", "bar", "donut", "kpi", "table"]),
    title: z.string().nullable(),
    labels: z.array(z.string()),
    series: z.array(
      z.object({
        label: z.string(),
        unit: z.string().nullable(),
        values: z.array(z.number().nullable()),
      })
    ),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
  }),
  /** An alert Wappi just saved; its card links to the row on the alerts page. `ends_at` stays ISO. */
  z.object({
    kind: z.literal("watch"),
    id: z.string(),
    label: z.string(),
    op: z.enum(["gt", "lt"]),
    threshold: z.number(),
    unit: z.string(),
    value: z.number().nullable(),
    ends_at: z.iso.datetime({ offset: true }),
    /** Set on load when the alerts page lists the watch as over (fired, expired, cancelled). */
    ended: z.boolean().optional(),
  }),
])
export type Widget = z.infer<typeof WidgetSchema>

/** Widgets one by one: one the client cannot read is dropped, never the whole answer. */
const WidgetsSchema = z.array(z.unknown()).transform((items) =>
  items.flatMap((item) => {
    const parsed = WidgetSchema.safeParse(item)
    if (parsed.success) return [parsed.data]
    console.warn(
      "copilot widget dropped",
      (item as { kind?: unknown } | null)?.kind,
      parsed.error.issues
    )
    return []
  })
)

const ReplySchema = z.object({
  intent: z.string(),
  tier: DataTierSchema,
  steps: z.array(StepSchema),
  /** The read-only query behind the figures (text2sql), shown for transparency. */
  sql: z.string().nullable(),
  /** The answer; `[n]` cites `sources[n - 1]`. */
  text: z.string(),
  sources: z.array(SourceSchema),
  widgets: WidgetsSchema,
  followUps: z.array(z.string()),
})
export type Reply = z.infer<typeof ReplySchema>

const timestamp = z.iso
  .datetime({ offset: true })
  .transform((v) => Date.parse(v))

export const ConversationSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  pinned: z.boolean(),
  updated_at: timestamp,
})

export const ConversationSchema = ConversationSummarySchema.extend({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      reply: ReplySchema.nullable(),
      feedback: z.enum(["up", "down"]).nullable(),
      created_at: timestamp,
    })
  ),
})

export const TranscriptSchema = z.object({
  text: z.string(),
  language: z.string().nullable(),
  duration: z.number().nullable(),
})

/** POST /copilot/chat's server-sent events. */
export const ChatEventSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("meta"),
    data: z.object({ conversation_id: z.string(), message_id: z.string() }),
  }),
  z.object({ event: z.literal("step"), data: StepSchema }),
  z.object({ event: z.literal("token"), data: z.object({ text: z.string() }) }),
  z.object({
    event: z.literal("done"),
    data: z.object({ message_id: z.string(), reply: ReplySchema }),
  }),
  z.object({
    event: z.literal("error"),
    data: z.object({
      code: z.string(),
      message: z.string(),
      reply: ReplySchema.nullable(),
    }),
  }),
])
export type ChatEvent = z.infer<typeof ChatEventSchema>

// Client state of the chat.

export type Phase =
  "thinking" | "working" | "streaming" | "done" | "stopped" | "error"

export type Message =
  | { id: string; role: "user"; text: string }
  | {
      id: string
      role: "assistant"
      phase: Phase
      /** The tool steps so far, then the reply's. */
      steps: Step[]
      /** The words so far, then the reply's text. */
      text: string
      /** Set once the answer is done (stored), or with what the tools found before an error. */
      reply?: Reply
      /** Why there is no answer: the backend's error code. */
      error?: string
      feedback: "up" | "down" | null
      startedAt?: number
      duration?: number
    }

export type Thread = {
  id: string
  title?: string
  updatedAt: number
  pinned?: boolean
  /** Undefined until the conversation is opened and fetched. */
  messages?: Message[]
  /** Its messages could not be fetched. */
  failed?: boolean
}

type Conversation = z.infer<typeof ConversationSchema>

/** A stored conversation as the chat shows it. */
export function toMessages(
  c: Conversation,
  watches: { id: string; status: string }[] = []
): Message[] {
  // A watch the list does not hold (newer than it, or past its 50 rows) stays shown as live.
  const ended = new Set(
    watches
      .filter((w) => w.status !== "active" && w.status !== "broken")
      .map((w) => w.id)
  )
  const withStatus = (reply: Reply): Reply => ({
    ...reply,
    widgets: reply.widgets.map((w) =>
      w.kind === "watch" && ended.has(w.id) ? { ...w, ended: true } : w
    ),
  })
  return c.messages.map((m) =>
    m.role === "user"
      ? { id: m.id, role: "user", text: m.content }
      : {
          id: m.id,
          role: "assistant",
          phase: "done",
          steps: m.reply?.steps ?? [],
          text: m.content,
          reply: m.reply ? withStatus(m.reply) : undefined,
          feedback: m.feedback,
        }
  )
}
