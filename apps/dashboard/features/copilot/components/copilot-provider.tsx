"use client"

import { createContext, use, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { DASHBOARD_PATH } from "@/config/routes"

import { demoReply, detectIntent, type Copy } from "../demo"
import { advance, playLength, type AssistantMessage } from "../playback"
import type { Intent, Message, Thread } from "../schemas"

type Status = "ready" | "submitted" | "streaming"

type CopilotState = {
  threads: Thread[]
  /** The open conversation; undefined is a new, empty one. */
  active?: Thread
  status: Status
  copy: Copy
  send: (text: string, intent?: Intent) => void
  stop: () => void
  regenerate: (messageId: string) => void
  select: (id?: string) => void
  rename: (id: string, title: string) => void
  remove: (id: string) => void
  pin: (id: string, pinned: boolean) => void
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  /** The last dashboard page the panel sat beside: where "Open alongside" returns from Wappi's page. */
  returnToRef: React.RefObject<string>
  /** The header's "Ask Wappi" button: focus goes back to it when the panel closes. */
  toggleRef: React.RefObject<HTMLButtonElement | null>
}

const CopilotContext = createContext<CopilotState | null>(null)

export function useCopilot() {
  const state = use(CopilotContext)
  if (!state) throw new Error("useCopilot must sit inside CopilotProvider")
  return state
}

const LIVE = new Set(["thinking", "working", "streaming"])

const id = () => crypto.randomUUID()

/** Conversations from earlier days, so the history is not empty in the preview. */
function seedThreads(copy: Copy): Thread[] {
  const ask = (intent: Intent, ago: number, pinned?: boolean): Thread => {
    const reply = demoReply(intent, copy)
    return {
      id: `demo-${intent}`,
      title: copy(`ask.${intent}`),
      ago,
      pinned,
      messages: [
        { id: `${intent}-q`, role: "user", text: copy(`ask.${intent}`) },
        advance(
          {
            id: `${intent}-a`,
            role: "assistant",
            reply,
            phase: "thinking",
            steps: 0,
            words: 0,
          },
          playLength(reply)
        ),
      ],
    }
  }
  return [
    ask("plan", 26 * 3_600_000, true),
    ask("bill", 2 * 3_600_000),
    ask("standby", 3 * 86_400_000),
  ]
}

/**
 * Wappi's conversations, shared by the side panel, the full page and their triggers (one provider in the dashboard
 * layout, so a chat continues when the panel expands into the page). Plays the scripted replies as a stream would.
 */
export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("copilot.demo")
  type Key = Parameters<typeof t>[0]
  const copy = useMemo<Copy>(
    () =>
      Object.assign(
        (key: string, values?: Record<string, string | number>) =>
          t(key as Key, values),
        {
          list: (key: string) => t.raw(key as Key) as string[],
        }
      ),
    [t]
  )
  const [threads, setThreads] = useState(() => seedThreads(copy))
  const [activeId, setActiveId] = useState<string>()
  const [panelOpen, setPanelOpen] = useState(false)
  const returnToRef = useRef(DASHBOARD_PATH)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const timer = useRef<number>(undefined)

  const update = (
    threadId: string,
    change: (messages: Message[]) => Message[]
  ) =>
    setThreads((all) =>
      all.map((th) =>
        th.id === threadId ? { ...th, messages: change(th.messages) } : th
      )
    )

  const halt = () => window.clearInterval(timer.current)

  /** Plays one assistant message from the start; the interval stops itself once the reply is shown in full. */
  const play = (threadId: string, message: AssistantMessage) => {
    halt()
    const started = Date.now()
    const length = playLength(message.reply)
    const tick = () => {
      const elapsed = Date.now() - started
      update(threadId, (messages) =>
        messages.map((m) =>
          m.id === message.id && m.role === "assistant"
            ? advance(m, elapsed)
            : m
        )
      )
      if (elapsed >= length) halt()
    }
    timer.current = window.setInterval(tick, 40)
  }

  const active = threads.find((th) => th.id === activeId)
  const live = active?.messages.find(
    (m) => m.role === "assistant" && LIVE.has(m.phase)
  )
  const status: Status =
    !live || live.role !== "assistant"
      ? "ready"
      : live.phase === "streaming"
        ? "streaming"
        : "submitted"

  const stopAll = () => {
    halt()
    setThreads((all) =>
      all.map((th) => ({
        ...th,
        messages: th.messages.map((m) =>
          m.role === "assistant" && LIVE.has(m.phase)
            ? { ...m, phase: "stopped" }
            : m
        ),
      }))
    )
  }

  useEffect(() => halt, [])

  const value: CopilotState = {
    threads,
    active,
    status,
    copy,
    panelOpen,
    setPanelOpen,
    returnToRef,
    toggleRef,
    // A question while an answer plays (a follow-up, a voice turn) stops that answer rather than being dropped.
    send: (text, intent) => {
      if (status !== "ready") stopAll()
      const reply = demoReply(intent ?? detectIntent(text), copy)
      const answer: AssistantMessage = {
        id: id(),
        role: "assistant",
        reply,
        phase: "thinking",
        steps: 0,
        words: 0,
        startedAt: Date.now(),
      }
      const question: Message = { id: id(), role: "user", text }
      const threadId = active?.id ?? id()
      setThreads((all) =>
        active
          ? all.map((th) =>
              th.id === threadId
                ? {
                    ...th,
                    updatedAt: Date.now(),
                    messages: [...th.messages, question, answer],
                  }
                : th
            )
          : [
              {
                id: threadId,
                title: text,
                updatedAt: Date.now(),
                messages: [question, answer],
              },
              ...all,
            ]
      )
      setActiveId(threadId)
      play(threadId, answer)
    },
    stop: stopAll,
    regenerate: (messageId) => {
      const message = active?.messages.find((m) => m.id === messageId)
      if (!active || status !== "ready" || message?.role !== "assistant") return
      const fresh: AssistantMessage = {
        ...message,
        phase: "thinking",
        steps: 0,
        words: 0,
        startedAt: Date.now(),
      }
      update(active.id, (messages) =>
        messages.map((m) => (m.id === messageId ? fresh : m))
      )
      play(active.id, fresh)
    },
    select: (threadId) => {
      if (status !== "ready") stopAll()
      setActiveId(threadId)
    },
    rename: (threadId, title) =>
      setThreads((all) =>
        all.map((th) => (th.id === threadId ? { ...th, title } : th))
      ),
    remove: (threadId) => {
      setThreads((all) => all.filter((th) => th.id !== threadId))
      if (threadId === activeId) setActiveId(undefined)
    },
    pin: (threadId, pinned) =>
      setThreads((all) =>
        all.map((th) => (th.id === threadId ? { ...th, pinned } : th))
      ),
  }

  return <CopilotContext value={value}>{children}</CopilotContext>
}
