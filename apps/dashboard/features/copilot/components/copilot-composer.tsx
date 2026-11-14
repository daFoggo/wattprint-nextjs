"use client"

import { useRef, useState } from "react"
import { IconEye, IconWaveSine } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { Button } from "@workspace/ui/components/hairline/button"
import { PromptComposer } from "@workspace/ui/components/hairline/prompt-composer"
import { Tooltip } from "@workspace/ui/components/hairline/tooltip"
import {
  VoiceInput,
  type VoiceStatus,
} from "@workspace/ui/components/hairline/voice-input"

import { useCopilot } from "./copilot-provider"

/** The slice of the Web Speech API dictation uses (Chrome and Edge ship it prefixed). */
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>
      }) => void)
    | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionWindow = {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}

/** Speech to text in the browser: the words show live, and land in the field when the speaker stops. */
function useDictation(onText: (text: string) => void) {
  const locale = useLocale()
  const [status, setStatus] = useState<VoiceStatus>("idle")
  const [transcript, setTranscript] = useState("")
  const [startedAt, setStartedAt] = useState<number>()
  const [unsupported, setUnsupported] = useState(false)
  const recognition = useRef<Recognition>(null)
  const cancelled = useRef(false)

  const start = () => {
    const speech = window as unknown as RecognitionWindow
    const Speech = speech.SpeechRecognition ?? speech.webkitSpeechRecognition
    setUnsupported(!Speech)
    if (!Speech) return setStatus("error")
    const r = new Speech()
    r.lang = locale === "vi" ? "vi-VN" : "en-US"
    r.interimResults = true
    r.continuous = true
    let heard = ""
    r.onresult = (event) => {
      heard = Array.from(
        event.results,
        (result) => result[0]?.transcript ?? ""
      ).join("")
      setTranscript(heard)
    }
    r.onerror = (event) => {
      cancelled.current = true
      setStatus(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "blocked"
          : "error"
      )
    }
    r.onend = () => {
      if (!cancelled.current && heard.trim()) onText(heard.trim())
      setStatus((s) => (s === "blocked" || s === "error" ? s : "idle"))
      setTranscript("")
    }
    cancelled.current = false
    recognition.current = r
    r.start()
    setTranscript("")
    setStartedAt(Date.now())
    setStatus("listening")
  }

  return {
    status,
    transcript,
    startedAt,
    unsupported,
    start,
    stop: () => {
      setStatus("transcribing")
      recognition.current?.stop()
    },
    cancel: () => {
      cancelled.current = true
      recognition.current?.abort()
      setStatus("idle")
    },
  }
}

/**
 * Hairline's PromptComposer wired to Wappi: Enter sends, Send turns into Stop while it answers, the mic dictates
 * into the field and the wave button switches to voice mode. `context` names the page the panel sits beside.
 */
export function CopilotComposer({
  context,
  onVoice,
}: {
  context?: string
  onVoice: () => void
}) {
  const t = useTranslations("copilot")
  const { send, stop, status } = useCopilot()
  const [text, setText] = useState("")
  const dictation = useDictation((heard) =>
    setText((prev) => (prev.trim() ? `${prev.trim()} ${heard}` : heard))
  )

  return (
    <PromptComposer
      // Hairline offers Stop only while streaming; Wappi's answers can be stopped while it still works too.
      status={status === "ready" ? "ready" : "streaming"}
      value={text}
      onValueChange={setText}
      onSubmit={(value) => {
        if (!value.trim()) return
        send(value.trim())
        setText("")
      }}
      onStop={stop}
      placeholder={t("placeholder")}
      maxLength={2000}
      attachments={
        context ? (
          <Badge
            outline
            size="sm"
            icon={<IconEye aria-hidden className="size-3" />}
          >
            {t("viewing", { page: context })}
          </Badge>
        ) : undefined
      }
      toolbar={
        <div className="flex items-center gap-1">
          <Tooltip content={t("voice.start")}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("voice.start")}
              onClick={onVoice}
            >
              <IconWaveSine aria-hidden className="size-4" />
            </Button>
          </Tooltip>
          <VoiceInput
            aria-label={t("voice.dictate")}
            className="w-48"
            status={dictation.status}
            transcript={dictation.transcript}
            startedAt={dictation.startedAt}
            onStart={dictation.start}
            onStop={dictation.stop}
            onCancel={dictation.cancel}
            errorText={
              dictation.unsupported ? t("voice.unsupported") : undefined
            }
          />
        </div>
      }
    />
  )
}
