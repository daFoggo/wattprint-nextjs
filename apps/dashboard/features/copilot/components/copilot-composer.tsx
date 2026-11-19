"use client"

import { useEffect, useRef, useState } from "react"
import { IconEye, IconWaveSine } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Badge } from "@workspace/ui/components/hairline/badge"
import { Button } from "@workspace/ui/components/hairline/button"
import { PromptComposer } from "@workspace/ui/components/hairline/prompt-composer"
import { Tooltip } from "@workspace/ui/components/hairline/tooltip"
import {
  VoiceInput,
  type VoiceStatus,
} from "@workspace/ui/components/hairline/voice-input"

import { redact, type PersonalKind } from "../privacy"
import { record, transcribeAudio, VoiceError } from "../voice"
import { useCopilot } from "./copilot-provider"

/** Dictation: the recording goes to the backend's speech to text, and its words land in the field. */
function useDictation(onText: (text: string) => void) {
  const locale = useLocale()
  const [status, setStatus] = useState<VoiceStatus>("idle")
  const [startedAt, setStartedAt] = useState<number>()
  const [failed, setFailed] = useState<string>()
  const recorder = useRef<Awaited<ReturnType<typeof record>>>(null)
  // Closing the panel mid-dictation lets go of the microphone (the browser's recording light goes off).
  useEffect(() => () => recorder.current?.cancel(), [])

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
  const locale = useLocale()
  const { send, stop, status } = useCopilot()
  const [text, setText] = useState("")
  // A question with personal data waits here, hidden, until the user sends it so or edits it.
  const [held, setHeld] = useState<{ text: string; found: PersonalKind[] }>()
  const submit = (question: string) => {
    send(question)
    setText("")
    setHeld(undefined)
  }
  const dictation = useDictation((heard) =>
    setText((prev) => (prev.trim() ? `${prev.trim()} ${heard}` : heard))
  )

  return (
    <>
      {held ? (
        <Alert
          tone="warning"
          title={t("privacy.title")}
          action={
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHeld(undefined)}
              >
                {t("privacy.edit")}
              </Button>
              <Button size="sm" onClick={() => submit(held.text)}>
                {t("privacy.send")}
              </Button>
            </div>
          }
        >
          {t("privacy.body", {
            kinds: new Intl.ListFormat(locale).format(
              held.found.map((k) => t(`privacy.kinds.${k}`))
            ),
          })}
        </Alert>
      ) : null}
      <PromptComposer
        // Hairline offers Stop only while streaming; Wappi's answers can be stopped while it still works too.
        status={status === "ready" ? "ready" : "streaming"}
        value={text}
        onValueChange={(value) => {
          setText(value)
          setHeld(undefined)
        }}
        onSubmit={(value) => {
          if (!value.trim()) return
          const hidden = redact(value.trim(), {
            email: t("privacy.labels.email"),
            card: t("privacy.labels.card"),
            id: t("privacy.labels.id"),
            phone: t("privacy.labels.phone"),
            account: t("privacy.labels.account"),
          })
          if (hidden.found.length) setHeld(hidden)
          else submit(value.trim())
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
    </>
  )
}
