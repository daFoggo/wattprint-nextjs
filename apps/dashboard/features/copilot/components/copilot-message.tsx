"use client"

import { useEffect, useRef, useState } from "react"
import { IconPlayerStopFilled, IconTool, IconVolume } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Badge } from "@workspace/ui/components/hairline/badge"
import { Button } from "@workspace/ui/components/hairline/button"
import { Checkbox } from "@workspace/ui/components/hairline/checkbox"
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

import { answerState } from "../moods"
import type { DataTier } from "../schemas"
import { citedSegments, plainText } from "../text"
import type { AssistantMessage } from "../threads"
import { speechUrl } from "../voice"
import { useCopilot } from "./copilot-provider"
import { SentOutside } from "./sent-outside"
import { WappiAvatar } from "./wappi-avatar"
import { CopilotWidget } from "./widgets"

const TIER_TONE: Record<
  DataTier,
  "success" | "neutral" | "primary" | "warning"
> = {
  measured: "success",
  document: "neutral",
  estimated: "primary",
  inferred: "warning",
}

const ERRORS = [
  "consent_required",
  "copilot_unavailable",
  "copilot_rate_limited",
  "conversation_not_found",
  "session",
] as const
type ErrorKey = (typeof ERRORS)[number] | "other"

const errorKey = (code: string): ErrorKey =>
  (ERRORS as readonly string[]).includes(code) ? (code as ErrorKey) : "other"

export function UserMessage({ text }: { text: string }) {
  return (
    <p className="ml-12 self-end rounded-3xl bg-muted px-4 py-2.5 text-base whitespace-pre-wrap">
      {text}
    </p>
  )
}

/** Reads the answer aloud in Wappi's voice (backend text to speech, streamed), and stops it on a second press. */
function SpeakButton({ messageId }: { messageId: string }) {
  const t = useTranslations("copilot.message")
  const locale = useLocale()
  const { consents, askConsent } = useCopilot()
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle")
  const audio = useRef<HTMLAudioElement>(null)
  const release = () => {
    const player = audio.current
    audio.current = null
    if (!player) return
    player.onplaying = player.onended = player.onerror = null // a later reading keeps its own state
    player.pause()
    player.removeAttribute("src") // ends the download, so the backend stops voicing the rest
    player.load()
  }
  useEffect(() => release, [])
  const stop = () => {
    release()
    setState("idle")
  }
  const play = () => {
    const player = new Audio(speechUrl(messageId, locale))
    audio.current = player
    player.onplaying = () => setState("playing")
    player.onended = player.onerror = stop
    setState("loading")
    player.play().catch(() => audio.current === player && stop())
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
        // Reading aloud sends the answer's text to the voice provider: the voice yes comes first.
        onClick={() =>
          busy ? stop() : consents?.voice ? play() : askConsent("voice", play)
        }
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

/** After a thumbs-down: the rating goes alone unless the box is ticked. */
function ShareChoice({
  onSend,
  onCancel,
}: {
  onSend: (share: boolean) => void
  onCancel: () => void
}) {
  const t = useTranslations("copilot.feedback")
  const [share, setShare] = useState(false)
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3">
      <Checkbox checked={share} onCheckedChange={setShare} label={t("share")} />
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={() => onSend(share)}>
          {t("send")}
        </Button>
      </div>
    </div>
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
  // A thumbs-down waits here until the user says whether the content goes with it.
  const [rating, setRating] = useState(false)
  const { reply, phase } = message
  const settled = phase === "done"
  const working = phase === "working"
  const plain = plainText(message.text).replace(/\s*\[\d+\]/g, "")
  const { segments, cited } = citedSegments(message.text, reply?.sources)
  const error = message.error ? errorKey(message.error) : undefined

  return (
    <article className="flex flex-col gap-3" lang={locale}>
      {/* Who speaks, with its face doing what the answer does (moods.ts); the tier says how the figures were got. */}
      <div className="flex items-center gap-2">
        <WappiAvatar size="lg" state={answerState(message)} live={last} />
        <span className="font-pixel-square text-sm">{name}</span>
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
          content={segments}
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

      {cited.length ? (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{t("sources")}</span>
          {cited.map((c) => {
            const label = (
              <>
                <span className="font-mono text-foreground">{c.n}</span>{" "}
                {c.title}
              </>
            )
            const link =
              "underline-offset-2 hover:text-foreground hover:underline"
            return c.url.startsWith("/") ? (
              <Link key={c.n} href={c.url} className={link}>
                {label}
              </Link>
            ) : (
              <a
                key={c.n}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className={link}
              >
                {label}
              </a>
            )
          })}
        </p>
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
            feedback={rating ? "down" : message.feedback}
            onFeedback={(value) => {
              // A second press only closes the box: the stored rating stays.
              if (rating && value === null) return setRating(false)
              setRating(value === "down")
              if (value !== "down") rate(message.id, value)
            }}
          />
          {plain ? <SpeakButton messageId={message.id} /> : null}
        </div>
      ) : null}

      {rating ? (
        <ShareChoice
          onSend={(share) => {
            setRating(false)
            rate(message.id, "down", share)
          }}
          onCancel={() => setRating(false)}
        />
      ) : null}

      {settled && reply ? (
        <p className="text-xs text-muted-foreground">{t("aiNote")}</p>
      ) : null}

      {reply?.sent?.parties.length ? <SentOutside sent={reply.sent} /> : null}

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
