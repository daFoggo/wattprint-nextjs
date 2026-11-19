import { z } from "zod"

// The copilot API's shapes (wattprint-backend app/modules/copilot): the reply and the stream are
// parsed with these on the client too, so a change on either side fails loudly.

/** Data tiering (hồ sơ §4.2): every answer says how its figures were obtained. */
const DataTierSchema = z.enum(["measured", "estimated", "inferred"])
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
  z.object({
    kind: z.literal("plan"),
    id: z.string(),
    tasks: z.array(z.object({ label: z.string(), detail: z.string() })),
    kwh: z.number(),
    vnd: z.number().nullable(),
    status: z.string(),
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
])
export type Widget = z.infer<typeof WidgetSchema>

const ReplySchema = z.object({
  intent: z.string(),
  tier: DataTierSchema,
  steps: z.array(StepSchema),
  /** The read-only query behind the figures (text2sql), shown for transparency. */
  sql: z.string().nullable(),
  /** The answer; `[n]` cites `sources[n - 1]`. */
  text: z.string(),
  sources: z.array(SourceSchema),
  widgets: z.array(WidgetSchema),
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
export function toMessages(c: Conversation): Message[] {
  return c.messages.map((m) =>
    m.role === "user"
      ? { id: m.id, role: "user", text: m.content }
      : {
          id: m.id,
          role: "assistant",
          phase: "done",
          steps: m.reply?.steps ?? [],
          text: m.content,
          reply: m.reply ?? undefined,
          feedback: m.feedback,
        }
  )
}
