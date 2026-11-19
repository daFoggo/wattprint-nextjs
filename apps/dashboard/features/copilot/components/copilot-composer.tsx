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

import { record, transcribeAudio, VoiceError } from "../voice"
import { useCopilot } from "./copilot-provider"

/** Dictation: the recording goes to the backend's speech to text, and its words land in the field. */
function useDictation(onText: (text: string) => void) {
  const locale = useLocale()
  const [status, setStatus] = useState<VoiceStatus>("idle")
  const [startedAt, setStartedAt] = useState<number>()
  const [failed, setFailed] = useState<string>()
  const recorder = useRef<Awaited<ReturnType<typeof record>>>(null)

  const start = async () => {
    setFailed(undefined)
    try {
      recorder.current = await record()
    } catch (error) {
      const denied =
        error instanceof DOMException && error.name === "NotAllowedError"
      return setStatus(denied ? "blocked" : "error")
    }
    setStartedAt(Date.now())
    setStatus("listening")
  }
  return {
    status,
    startedAt,
    failed,
    start: () => void start(),
    stop: async () => {
      const r = recorder.current
      if (!r) return
      setStatus("transcribing")
      try {
        const text = await transcribeAudio(await r.stop(), locale)
        if (text) onText(text)
        setStatus("idle")
      } catch (error) {
        setFailed(error instanceof VoiceError ? error.code : "error")
        setStatus("error")
      }
    },
    cancel: () => {
      recorder.current?.cancel()
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
            startedAt={dictation.startedAt}
            onStart={dictation.start}
            onStop={dictation.stop}
            onCancel={dictation.cancel}
            errorText={
              dictation.failed === "voice_unavailable"
                ? t("voice.unavailable")
                : dictation.failed
                  ? t("voice.failed")
                  : undefined
            }
          />
        </div>
      }
    />
  )
}
