import type { Message, Phase, Thread } from "./schemas"

export type Status = "ready" | "submitted" | "streaming"

const LIVE = new Set<Phase>(["thinking", "working", "streaming"])

const isLive = (m: Message) => m.role === "assistant" && LIVE.has(m.phase)

/** Whether the thread's last answer is still being worked out (submitted), written (streaming), or neither (ready). */
export function statusOf(thread?: Thread): Status {
  const live = thread?.messages.find(isLive)
  if (live?.role !== "assistant") return "ready"
  return live.phase === "streaming" ? "streaming" : "submitted"
}

/** Every answer still playing, in any thread, marked stopped where it stands. */
export const stopLive = (threads: Thread[]): Thread[] =>
  threads.map((th) =>
    th.messages.some(isLive)
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
      ? { ...th, updatedAt: now, messages: [...th.messages, ...turn] }
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
          messages: th.messages.map((m) =>
            m.id === messageId ? change(m) : m
          ),
        }
      : th
  )
