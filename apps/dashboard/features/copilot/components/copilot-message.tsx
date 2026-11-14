"use client"

import { useState } from "react"
import { IconPlayerStopFilled, IconTool, IconVolume } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { Button } from "@workspace/ui/components/hairline/button"
import { ClarifyingQuestion } from "@workspace/ui/components/hairline/clarifying-question"
import { CodeBlock } from "@workspace/ui/components/hairline/code-block"
import {
  AnswerActions,
  FollowUps,
  StreamingText,
} from "@workspace/ui/components/hairline/streaming-answer"
import { ThinkingIndicator } from "@workspace/ui/components/hairline/thinking-indicator"
import { ThinkingTrace } from "@workspace/ui/components/hairline/thinking-trace"
import { ToolCall } from "@workspace/ui/components/hairline/tool-call"
import { Tooltip } from "@workspace/ui/components/hairline/tooltip"

import { segments, tokens, type AssistantMessage } from "../playback"
import type { DataTier } from "../schemas"
import { useCopilot } from "./copilot-provider"
import { CopilotWidget } from "./widgets"

const TIER_TONE: Record<DataTier, "success" | "primary" | "warning"> = {
  measured: "success",
  estimated: "primary",
  inferred: "warning",
}

export function UserMessage({ text }: { text: string }) {
  return (
    <p className="ml-12 self-end rounded-3xl bg-muted px-4 py-2.5 text-base whitespace-pre-wrap">
      {text}
    </p>
  )
}

/** Reads the answer aloud with the browser's own voice (text to speech), and stops it on a second press. */
function SpeakButton({ text }: { text: string }) {
  const t = useTranslations("copilot.message")
  const locale = useLocale()
  const [speaking, setSpeaking] = useState(false)
  if (typeof window !== "undefined" && !("speechSynthesis" in window))
    return null
  const toggle = () => {
    speechSynthesis.cancel()
    if (speaking) return setSpeaking(false)
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = locale === "vi" ? "vi-VN" : "en-US"
    utterance.onend = utterance.onerror = () => setSpeaking(false)
    speechSynthesis.speak(utterance)
    setSpeaking(true)
  }
  const label = speaking ? t("stopSpeaking") : t("speak")
  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-pressed={speaking}
        onClick={toggle}
      >
        {speaking ? (
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
  const { send, regenerate, status } = useCopilot()
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null)
  const { reply, phase } = message
  const settled = phase === "done"
  const plain = reply.text.replace(/\s*\[\d+\]/g, "")
  const working = phase === "working"
  const shownSteps = reply.steps.slice(
    0,
    working ? message.steps + 1 : message.steps
  )

  return (
    <article className="flex flex-col gap-3">
      {/* No avatar per message: the logo introduces Wappi once (title, opening screen); answers are the unboxed text. */}
      {reply.steps.length ? (
        <Badge
          tone={TIER_TONE[reply.tier]}
          dot
          size="sm"
          className="self-start"
        >
          {t(`tiers.${reply.tier}`)}
        </Badge>
      ) : null}

      {phase === "thinking" ? (
        <ThinkingIndicator
          variant="dots"
          label={t("thinking")}
          startedAt={message.startedAt}
        />
      ) : null}

      {shownSteps.length ? (
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
          doneLabel={t("worked", { count: shownSteps.length })}
          startedAt={working ? message.startedAt : undefined}
          duration={message.duration}
          steps={shownSteps.map((step, i) => ({
            ...step,
            status: working && i === message.steps ? "running" : "done",
          }))}
        />
      ) : null}

      {phase === "streaming" || settled || phase === "stopped" ? (
        <StreamingText
          content={segments(
            reply,
            settled ? tokens(reply.text).length : message.words
          )}
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

      {settled && reply.sql ? (
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

      {settled
        ? reply.widgets.map((widget, i) => (
            <CopilotWidget key={`${widget.kind}-${i}`} widget={widget} />
          ))
        : null}

      {settled && reply.question ? (
        <ClarifyingQuestion
          question={reply.question.text}
          options={reply.question.options}
          onAnswer={(answer) => {
            const option = reply.question?.options.find(
              (o) => o.id === answer.ids[0]
            )
            if (option) send(option.label, option.id)
          }}
        />
      ) : null}

      {settled && reply.steps.length ? (
        <div className="flex items-center gap-1">
          <AnswerActions
            copyText={plain}
            onRegenerate={
              last && status === "ready"
                ? () => {
                    setFeedback(null)
                    regenerate(message.id)
                  }
                : undefined
            }
            feedback={feedback}
            onFeedback={setFeedback}
            sources={reply.sources.map((s) => ({ name: s.title, href: s.url }))}
          />
          <SpeakButton text={plain} />
        </div>
      ) : null}

      {settled && last && reply.followUps.length ? (
        <FollowUps
          label={t("followUps")}
          items={reply.followUps}
          onSelect={(item) => send(item)}
        />
      ) : null}
    </article>
  )
}
