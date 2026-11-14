import type { AnswerSegment } from "@workspace/ui/components/hairline/streaming-answer"

import type { Message, Reply } from "./schemas"

// shortcut: the mock's pacing stands in for the stream; with the real endpoint each SSE event sets steps and words instead.
const THINK = 700
const STEP = 600
const WORD = 22

export type AssistantMessage = Extract<Message, { role: "assistant" }>

/** Words with the spaces after them, so the answer streams word by word and joins back exactly. */
export const tokens = (text: string) => text.match(/\S+\s*/g) ?? []

/** How long a reply takes to play in full (ms). */
export const playLength = (reply: Reply) =>
  THINK + reply.steps.length * STEP + tokens(reply.text).length * WORD

/** The message `elapsed` ms after it was asked: thinking, then one tool step at a time, then the words. */
export function advance(
  message: AssistantMessage,
  elapsed: number
): AssistantMessage {
  const steps = message.reply.steps.length
  const words = tokens(message.reply.text).length
  if (elapsed < THINK) return { ...message, phase: "thinking" }
  const working = elapsed - THINK
  if (working < steps * STEP) {
    return { ...message, phase: "working", steps: Math.floor(working / STEP) }
  }
  const shown = Math.floor((working - steps * STEP) / WORD)
  if (shown < words)
    return { ...message, phase: "streaming", steps, words: shown }
  return { ...message, phase: "done", steps, words, duration: elapsed }
}

/** The first `words` words, with each `[n]` turned into a citation chip for `sources[n - 1]`. */
export function segments(reply: Reply, words: number): AnswerSegment[] {
  const text = tokens(reply.text).slice(0, words).join("")
  return text.split(/\[(\d+)\]/).flatMap((part, i): AnswerSegment[] => {
    if (i % 2 === 0) return part ? [part] : []
    const source = reply.sources[Number(part) - 1]
    return source
      ? [{ type: "citation", label: source.title, href: source.url }]
      : []
  })
}
