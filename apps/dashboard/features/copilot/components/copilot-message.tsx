"use client"

import { useEffect, useRef, useState } from "react"
import { IconPlayerStopFilled, IconTool, IconVolume } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Badge } from "@workspace/ui/components/hairline/badge"
import { Button } from "@workspace/ui/components/hairline/button"
import { CodeBlock } from "@workspace/ui/components/hairline/code-block"
import {
  AnswerActions,
  FollowUps,
  StreamingText,
  type AnswerSegment,
} from "@workspace/ui/components/hairline/streaming-answer"
import { ThinkingIndicator } from "@workspace/ui/components/hairline/thinking-indicator"
import { ThinkingTrace } from "@workspace/ui/components/hairline/thinking-trace"
import { ToolCall } from "@workspace/ui/components/hairline/tool-call"
import { Tooltip } from "@workspace/ui/components/hairline/tooltip"

import { answerState } from "../moods"
import type { DataTier, Reply } from "../schemas"
import type { AssistantMessage } from "../threads"
import { speechOf } from "../voice"
import { useCopilot } from "./copilot-provider"
import { WappiAvatar } from "./wappi-avatar"
import { CopilotWidget } from "./widgets"

const TIER_TONE: Record<DataTier, "success" | "primary" | "warning"> = {
  measured: "success",
  estimated: "primary",
  inferred: "warning",
}

const ERRORS = [
  "copilot_unavailable",
  "copilot_rate_limited",
  "conversation_not_found",
] as const
type ErrorKey = (typeof ERRORS)[number] | "other"

const errorKey = (code: string): ErrorKey =>
  (ERRORS as readonly string[]).includes(code) ? (code as ErrorKey) : "other"

/** The text with each `[n]` as a citation chip for `sources[n - 1]`; without sources yet (streaming), the marks go. */
export function segments(
  text: string,
  sources: Reply["sources"] = []
): AnswerSegment[] {
  return text.split(/\[(\d+)\]/).flatMap((part, i): AnswerSegment[] => {
    if (i % 2 === 0) return part ? [part] : []
    const source = sources[Number(part) - 1]
    return source
      ? [{ type: "citation", label: source.title, href: source.url }]
      : []
  })
}

export function UserMessage({ text }: { text: string }) {
  return (
    <p className="ml-12 self-end rounded-3xl bg-muted px-4 py-2.5 text-base whitespace-pre-wrap">
      {text}
    </p>
  )
}

/** Reads the answer aloud in Wappi's voice (backend text to speech), and stops it on a second press. */
function SpeakButton({ text }: { text: string }) {
  const t = useTranslations("copilot.message")
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle")
  const audio = useRef<HTMLAudioElement>(null)
  const abort = useRef<AbortController>(null)
  useEffect(
    () => () => {
      abort.current?.abort()
      audio.current?.pause()
    },
    []
  )
  const stop = () => {
    abort.current?.abort()
    audio.current?.pause()
    setState("idle")
  }
  const play = async () => {
    const controller = new AbortController()
    abort.current = controller
    setState("loading")
    try {
      const res = await speechOf(text, controller.signal)
      const url = URL.createObjectURL(await res.blob())
      const player = new Audio(url)
      audio.current = player
      player.onended = player.onerror = () => {
        URL.revokeObjectURL(url)
        setState("idle")
      }
      await player.play()
      setState("playing")
    } catch {
      if (!controller.signal.aborted) setState("idle")
    }
  }
  const busy = state !== "idle"
  const label = busy ? t("stopSpeaking") : t("speak")
  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-pressed={busy}
        onClick={busy ? stop : () => void play()}
      >
        {busy ? (
          <IconPlayerStopFilled aria-hidden className="size-4" />
        ) : (
          <IconVolume aria-hidden className="size-4" />
        )}
      </Button>
    </Tooltip>
  )
}

/**
 * One answer from Wappi, in the order the work happens: thinking, the tool calls (each a data source the figures
 * come from), the answer with its sources cited inline, the data drawn as dashboard charts, then actions and
 * follow-ups. The tier badge says how the figures were obtained (measured, NILM estimate, inferred).
 */
export function AssistantMessageView({
  message,
  last,
}: {
  message: AssistantMessage
  last: boolean
}) {
  const t = useTranslations("copilot.message")
  const name = useTranslations("copilot")("name")
  const locale = useLocale()
  const { send, rate } = useCopilot()
  const { reply, phase } = message
  const settled = phase === "done"
  const working = phase === "working"
  const plain = message.text.replace(/\s*\[\d+\]/g, "")
  const error = message.error ? errorKey(message.error) : undefined

  return (
    <article className="flex flex-col gap-3" lang={locale}>
      {/* Who speaks, with its face doing what the answer does (moods.ts); the tier says how the figures were got. */}
      <div className="flex items-center gap-2">
        <WappiAvatar size="lg" state={answerState(message)} live={last} />
        <span className="text-sm font-medium">{name}</span>
        {reply?.steps.length ? (
          <Badge tone={TIER_TONE[reply.tier]} dot size="sm">
            {t(`tiers.${reply.tier}`)}
          </Badge>
        ) : null}
      </div>

      {phase === "thinking" ? (
        <ThinkingIndicator
          variant="dots"
          label={t("thinking")}
          startedAt={message.startedAt}
        />
      ) : null}

      {message.steps.length ? (
        <ThinkingTrace
          variant="tools"
          status={
            working ? "running" : phase === "stopped" ? "cancelled" : "done"
          }
          // A tool mark instead of Hairline's sparkle (no sparkles: design-system.md); Hairline's own when cancelled.
          icon={
            phase === "stopped" ? undefined : <IconTool className="size-4" />
          }
          label={t("working")}
          doneLabel={t("worked", { count: message.steps.length })}
          startedAt={working ? message.startedAt : undefined}
          duration={message.duration}
          steps={message.steps.map((step, i) => ({
            ...step,
            status:
              working && i === message.steps.length - 1 ? "running" : "done",
          }))}
        />
      ) : null}

      {message.text ? (
        <StreamingText
          content={segments(message.text, reply?.sources)}
          status={
            phase === "streaming"
              ? "streaming"
              : phase === "stopped"
                ? "stopped"
                : "done"
          }
          className="text-base"
        />
      ) : null}

      {error ? (
        <Alert tone="warning" title={t(`errors.${error}.title`)}>
          {t(`errors.${error}.body`)}
        </Alert>
      ) : null}

      {reply?.sql ? (
        <ToolCall
          name="text2sql"
          title={t("sql")}
          status="done"
          input={{ readOnly: true }}
          output={reply.sql}
          renderOutput={(sql) => (
            <CodeBlock code={String(sql)} language="sql" />
          )}
        />
      ) : null}

      {reply?.widgets.map((widget, i) => (
        <CopilotWidget key={`${widget.kind}-${i}`} widget={widget} />
      ))}

      {settled && reply ? (
        <div className="flex items-center gap-1">
          <AnswerActions
            copyText={plain}
            feedback={message.feedback}
            onFeedback={(value) => rate(message.id, value)}
            sources={reply.sources.map((s) => ({ name: s.title, href: s.url }))}
          />
          {plain ? <SpeakButton text={plain} /> : null}
        </div>
      ) : null}

      {settled && last && reply?.followUps.length ? (
        <FollowUps
          label={t("followUps")}
          items={reply.followUps}
          onSelect={(item) => void send(item)}
        />
      ) : null}
    </article>
  )
}
