// shortcut: plain types for the mock; turn them into Zod DTOs when the copilot endpoint (SSE) lands, so the stream is parsed.

/** What Wappi can answer today; `clarify` asks back when the question fits none. */
export const INTENTS = [
  "devices",
  "bill",
  "forecast",
  "weather",
  "plan",
  "peers",
  "standby",
  "clarify",
] as const
export type Intent = (typeof INTENTS)[number]

/** Data tiering (hồ sơ §4.2): every answer says how its figures were obtained. */
export type DataTier = "measured" | "estimated" | "inferred"

export type Source = { title: string; url: string }

export type Widget =
  | { kind: "devices"; slices: { id: string; label: string; value: number }[] }
  | {
      kind: "compare"
      currentLabel: string
      previousLabel: string
      data: { key: string; label: string; current: number; previous: number }[]
    }
  | { kind: "forecast"; used: number; limit: number; kwh: number; vnd: number }
  | {
      kind: "weather"
      temp: number
      feels: number
      humidity: number
      tips: string[]
    }
  | {
      kind: "plan"
      tasks: { label: string; detail: string }[]
      kwh: number
      vnd: number
    }
  | { kind: "peers"; you: number; median: number; days: number; homes: number }
  | { kind: "standby"; watts: number[]; kwh: number; vnd: number }
  | { kind: "links"; links: { label: string; href: string }[] }

export type Reply = {
  intent: Intent
  tier: DataTier
  /** Tool calls the agent makes before answering, as the trace shows them. */
  steps: { label: string; detail: string }[]
  /** The read-only query behind the figures, shown for transparency. */
  sql?: string
  /** The answer; `[n]` cites `sources[n - 1]`. */
  text: string
  sources: Source[]
  widgets: Widget[]
  followUps: string[]
  /** Asked back instead of guessing (`clarify`). */
  question?: { text: string; options: { id: Intent; label: string }[] }
}

export type Phase = "thinking" | "working" | "streaming" | "done" | "stopped"

export type Message =
  | { id: string; role: "user"; text: string }
  | {
      id: string
      role: "assistant"
      reply: Reply
      phase: Phase
      /** Steps and words revealed so far while it plays. */
      steps: number
      words: number
      startedAt?: number
      duration?: number
    }

export type Thread = {
  id: string
  title?: string
  /** Real threads carry a time; demo ones an age, resolved on the client (no clock while prerendering). */
  updatedAt?: number
  ago?: number
  pinned?: boolean
  messages: Message[]
}
