"use client"

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useLocale } from "next-intl"

import { DASHBOARD_PATH } from "@/config/routes"

import {
  deleteConversationAction,
  listConversationsAction,
  loadConversationAction,
  rateAnswerAction,
  updateConversationAction,
} from "../actions"
import type { Mood } from "../moods"
import type { Message, Thread } from "../schemas"
import { chatEvents } from "../stream"
import {
  addTurn,
  applyEvent,
  statusOf,
  stopLive,
  updateMessage,
  type AssistantMessage,
  type Status,
} from "../threads"

/** A short reaction of Wappi's avatar to something that just happened. */
export type Reaction = Extract<
  Mood,
  "answered" | "liked" | "disliked" | "celebrating"
>

type CopilotState = {
  threads: Thread[]
  /** False until the history has been fetched; "failed" when it could not be. */
  loaded: boolean | "failed"
  /** The open conversation; undefined is a new, empty one. */
  active?: Thread
  status: Status
  reaction?: Reaction
  /** Ask; resolves with the stored answer's id once it is done (null if it failed or was stopped). */
  send: (text: string) => Promise<string | null>
  stop: () => void
  select: (id?: string) => void
  loadThreads: () => void
  rename: (id: string, title: string) => void
  remove: (id: string) => void
  pin: (id: string, pinned: boolean) => void
  rate: (messageId: string, value: "up" | "down" | null) => void
  react: (reaction: Reaction) => void
}

/** The side panel's state, apart from the chat's: what reads only this (the sidebar entry, the header button) does
 * not re-render with every word of a streaming answer. */
type PanelState = {
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  /** The last dashboard page the panel sat beside: where "Back to the side panel" returns from Wappi's page. */
  returnToRef: React.RefObject<string>
  /** The header's "Ask Wappi" button: focus goes back to it when the panel closes. */
  toggleRef: React.RefObject<HTMLButtonElement | null>
}

const CopilotContext = createContext<CopilotState | null>(null)
const PanelContext = createContext<PanelState | null>(null)

export function useCopilot() {
  const state = use(CopilotContext)
  if (!state) throw new Error("useCopilot must sit inside CopilotProvider")
  return state
}

export function usePanel() {
  const state = use(PanelContext)
  if (!state) throw new Error("usePanel must sit inside CopilotProvider")
  return state
}

const id = () => crypto.randomUUID()
const NEW = "new:" // a conversation the backend has not named yet

/** The backend's error code of a failed request ({ code } from the route handler). */
async function codeOf(res: Response) {
  const body = (await res.json().catch(() => null)) as { code?: string } | null
  return body?.code ?? "error"
}

/**
 * Wappi's conversations, shared by the side panel, the full page and their triggers (one provider in the dashboard
 * layout, so a chat continues when the panel expands into the page). Answers stream from the backend through
 * /api/copilot/chat; history, names and pins are Server Actions.
 */
export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const [threads, setThreads] = useState<Thread[]>([])
  /** false until fetched; "failed" when the history could not be read. */
  const [loaded, setLoaded] = useState<boolean | "failed">(false)
  const [activeId, setActiveId] = useState<string>()
  const [panelOpen, setPanelOpen] = useState(false)
  const [reaction, setReaction] = useState<Reaction>()
  const returnToRef = useRef(DASHBOARD_PATH)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const abortRef = useRef<AbortController>(undefined)
  const loadingRef = useRef(false)
  const reactTimer = useRef<number>(undefined)

  const active = threads.find((th) => th.id === activeId)
  const status = statusOf(active)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setThreads(stopLive)
  }, [])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      window.clearTimeout(reactTimer.current)
    },
    []
  )

  const loadThreads = useCallback(() => {
    if (loadingRef.current) return
    loadingRef.current = true
    listConversationsAction()
      .then((list) => {
        // Keep what this session already holds (a conversation open or just asked).
        setThreads((held) => [
          ...held.filter((h) => !list.some((l) => l.id === h.id)),
          ...list.map((l) => ({
            ...l,
            messages: held.find((h) => h.id === l.id)?.messages,
          })),
        ])
        setLoaded(true)
      })
      .catch((error) => {
        console.error(error)
        setLoaded("failed")
      })
      .finally(() => (loadingRef.current = false))
  }, [])

  const react = useCallback((r: Reaction) => {
    window.clearTimeout(reactTimer.current)
    setReaction(r)
    reactTimer.current = window.setTimeout(() => setReaction(undefined), 2600)
  }, [])

  const send = async (text: string): Promise<string | null> => {
    // A question while an answer comes (a follow-up, a voice turn) stops that answer rather than being dropped.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    let threadId = active?.id ?? `${NEW}${id()}`
    let answerId = id()
    const answer: AssistantMessage = {
      id: answerId,
      role: "assistant",
      phase: "thinking",
      steps: [],
      text: "",
      feedback: null,
      startedAt: Date.now(),
    }
    setThreads((all) =>
      addTurn(
        stopLive(all),
        threadId,
        [{ id: id(), role: "user", text }, answer],
        Date.now()
      )
    )
    setActiveId(threadId)
    const change = (fn: (m: AssistantMessage) => AssistantMessage) =>
      setThreads((all) =>
        updateMessage(all, threadId, answerId, (m) =>
          m.role === "assistant" ? fn(m) : m
        )
      )
    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: threadId.startsWith(NEW) ? undefined : threadId,
          question: text,
          lang: locale === "en" ? "en" : "vi",
        }),
        signal: controller.signal,
      })
      // A session that expired is redirected to an HTML page: not a stream either.
      const stream = res.headers
        .get("content-type")
        ?.startsWith("text/event-stream")
      if (!res.ok || !res.body || !stream) {
        const code = res.ok ? "session" : await codeOf(res)
        change((m) => ({ ...m, phase: "error", error: code }))
        return null
      }
      let final: string | null = null
      let ended = false
      for await (const event of chatEvents(res.body)) {
        if (event.event === "meta") {
          // The backend names the conversation and the answer: follow its ids from here on.
          const was = threadId
          const named = event.data.conversation_id
          setThreads((all) =>
            all.map((th) => (th.id === was ? { ...th, id: named } : th))
          )
          setActiveId((current) => (current === was ? named : current))
          threadId = named
        }
        const before = answerId
        if (event.event === "meta" || event.event === "done")
          answerId = event.data.message_id
        setThreads((all) =>
          updateMessage(all, threadId, before, (m) =>
            m.role === "assistant" ? applyEvent(m, event, Date.now()) : m
          )
        )
        if (event.event === "done") {
          final = event.data.message_id
          react("answered")
        }
        if (event.event === "done" || event.event === "error") ended = true
      }
      // The stream closed without its last word (the server went away): say so, never spin.
      if (!ended) change((m) => ({ ...m, phase: "error", error: "network" }))
      return final
    } catch (error) {
      if (controller.signal.aborted) return null // stopped: stopLive marked it
      console.error(error)
      change((m) => ({ ...m, phase: "error", error: "network" }))
      return null
    }
  }

  const panel = useMemo<PanelState>(
    () => ({ panelOpen, setPanelOpen, returnToRef, toggleRef }),
    [panelOpen]
  )

  const setThread = (threadId: string, patch: Partial<Thread>) =>
    setThreads((all) =>
      all.map((th) => (th.id === threadId ? { ...th, ...patch } : th))
    )

  /** A history change the backend refused: show its list again rather than one it does not hold. */
  const resync = (error: unknown) => {
    console.error(error)
    loadingRef.current = false
    loadThreads()
  }

  const value: CopilotState = {
    threads,
    loaded,
    active,
    status,
    reaction,
    send,
    stop,
    loadThreads,
    react,
    select: (threadId) => {
      if (status !== "ready") stop()
      setActiveId(threadId)
      const th = threads.find((t) => t.id === threadId)
      if (threadId && !th?.messages) {
        setThread(threadId, { failed: false })
        loadConversationAction(threadId)
          .then((messages: Message[]) =>
            setThread(threadId, { messages, failed: false })
          )
          .catch((error) => {
            console.error(error)
            setThread(threadId, { failed: true })
          })
      }
    },
    rename: (threadId, title) => {
      setThread(threadId, { title })
      updateConversationAction(threadId, { title }).catch(resync)
    },
    remove: (threadId) => {
      setThreads((all) => all.filter((th) => th.id !== threadId))
      if (threadId === activeId) {
        abortRef.current?.abort()
        setActiveId(undefined)
      }
      if (!threadId.startsWith(NEW))
        deleteConversationAction(threadId).catch(resync)
    },
    pin: (threadId, pinned) => {
      setThread(threadId, { pinned })
      updateConversationAction(threadId, { pinned }).catch(resync)
    },
    rate: (messageId, feedback) => {
      if (!activeId) return
      setThreads((all) =>
        updateMessage(all, activeId, messageId, (m) =>
          m.role === "assistant" ? { ...m, feedback } : m
        )
      )
      if (feedback) react(feedback === "up" ? "liked" : "disliked")
      rateAnswerAction(messageId, feedback).catch(console.error)
    },
  }

  return (
    <PanelContext value={panel}>
      <CopilotContext value={value}>{children}</CopilotContext>
    </PanelContext>
  )
}
