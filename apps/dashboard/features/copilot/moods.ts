import type { Message } from "./schemas"

/**
 * Every face Wappi shows, named by what happens in the app. This is the one place that picks avatar states
 * (@bible-strong/avatar-core's catalogue: `stateNames`); components ask for a mood or a message's state, never a raw
 * state. A new reaction is one line here. The test checks each state exists and keeps a face: the catalogue's
 * "Spinners" turn the body into a dot, unreadable at 16-32 px (only `thinking`'s three dots are kept).
 */
export const MOODS = {
  idle: "idle",
  /** The opening screen, waiting for a first question. */
  greeting: "curious",
  thinking: "thinking",
  /** A tool without its own mood below. */
  working: "working",
  writing: "streaming",
  /** Just answered: a short reaction, then back to idle. */
  answered: "happy",
  stopped: "bored",
  failed: "failed",
  /** Too many questions in a minute. */
  tired: "drowsy",
  liked: "approving",
  disliked: "sad",
  /** A savings plan was started. */
  celebrating: "celebrate",
  listening: "listening",
  transcribing: "listening",
  speaking: "humming",
} as const

export type Mood = keyof typeof MOODS

/** What Wappi does while each backend tool runs (app/modules/copilot/services/tools.py). */
export const TOOL_STATES: Record<string, string> = {
  devices_breakdown: "controlling",
  alerts: "surprised",
  standby: "suspicious",
  current_bill: "computing",
  bill_forecast: "computing",
  compare_periods: "working",
  bill_history: "reading",
  cohort: "reading",
  weather: "excited",
  query_data: "coding",
  propose_plan: "running",
}

type Answer = Extract<Message, { role: "assistant" }>

/** An answer's face: what it is doing while it comes, then how it ended and how the user rated it. */
export function answerState(m: Answer): string {
  switch (m.phase) {
    case "thinking":
      return MOODS.thinking
    case "working":
      return TOOL_STATES[m.steps.at(-1)?.tool ?? ""] ?? MOODS.working
    case "streaming":
      return MOODS.writing
    case "stopped":
      return MOODS.stopped
    case "error":
      return m.error === "copilot_rate_limited" ? MOODS.tired : MOODS.failed
    case "done":
      return m.feedback === "up"
        ? MOODS.liked
        : m.feedback === "down"
          ? MOODS.disliked
          : MOODS.idle
  }
}
