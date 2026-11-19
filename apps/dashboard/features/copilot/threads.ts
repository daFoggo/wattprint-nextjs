import type { ChatEvent, Message, Phase, Thread } from "./schemas"

export type Status = "ready" | "submitted" | "streaming"
export type AssistantMessage = Extract<Message, { role: "assistant" }>

const LIVE = new Set<Phase>(["thinking", "working", "streaming"])

const isLive = (m: Message) => m.role === "assistant" && LIVE.has(m.phase)

/** Whether the thread's last answer is still being worked out (submitted), written (streaming), or neither (ready). */
export function statusOf(thread?: Thread): Status {
  // Still fetching its messages: a question now would be overwritten when they land.
  if (thread && !thread.messages && !thread.failed) return "submitted"
  const live = thread?.messages?.find(isLive)
  if (live?.role !== "assistant") return "ready"
  return live.phase === "streaming" ? "streaming" : "submitted"
}

/** Every answer still coming, in any thread, marked stopped where it stands. */
export const stopLive = (threads: Thread[]): Thread[] =>
  threads.map((th) =>
    th.messages?.some(isLive)
      ? {
          ...th,
          messages: th.messages.map((m) =>
            isLive(m) ? { ...m, phase: "stopped" as const } : m
          ),
        }
      : th
  )

/** A question and its answer appended to the thread, or to a new one (titled by the question) put first. */
export function addTurn(
  threads: Thread[],
  threadId: string,
  turn: [question: Message & { role: "user" }, answer: Message],
  now: number
): Thread[] {
  if (!threads.some((th) => th.id === threadId))
    return [
      { id: threadId, title: turn[0].text, updatedAt: now, messages: turn },
      ...threads,
    ]
  return threads.map((th) =>
    th.id === threadId
      ? { ...th, updatedAt: now, messages: [...(th.messages ?? []), ...turn] }
      : th
  )
}

/** One message of one thread replaced by `change(message)`. */
export const updateMessage = (
  threads: Thread[],
  threadId: string,
  messageId: string,
  change: (message: Message) => Message
): Thread[] =>
  threads.map((th) =>
    th.id === threadId
      ? {
          ...th,
          messages: th.messages?.map((m) =>
            m.id === messageId ? change(m) : m
          ),
        }
      : th
  )

/** The answer after one event of its stream (`meta` names the thread and is handled by the caller). */
export function applyEvent(
  m: AssistantMessage,
  e: ChatEvent,
  now: number
): AssistantMessage {
  const took = m.startedAt ? now - m.startedAt : undefined
  switch (e.event) {
    case "meta":
      return { ...m, id: e.data.message_id }
    case "step":
      return { ...m, phase: "working", steps: [...m.steps, e.data] }
    case "token":
      return { ...m, phase: "streaming", text: m.text + e.data.text }
    case "done":
      return {
        ...m,
        id: e.data.message_id,
        phase: "done",
        reply: e.data.reply,
        text: e.data.reply.text,
        steps: e.data.reply.steps,
        duration: took,
      }
    case "error":
      return {
        ...m,
        phase: "error",
        error: e.data.code,
        reply: e.data.reply ?? undefined,
        duration: took,
      }
  }
}
