"use client"

import { useEffect } from "react"
import { IconArrowLeft } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"
import { VoiceTalk } from "@workspace/ui/components/hairline/voice-talk"

import { useCopilot } from "./copilot-provider"

/**
 * Voice mode: Hairline's VoiceTalk, the fluid orb with its one morphing button (Talk, Send, Thinking, Interrupt),
 * microphone handling and end-of-speech detection. Each turn also lands in the chat, so nothing said is lost.
 */
export function VoiceMode({
  size,
  onBack,
}: {
  size: number
  onBack: () => void
}) {
  const t = useTranslations("copilot")
  const locale = useLocale()
  const { send, copy } = useCopilot()
  type LabelKey = Parameters<typeof t>[0]
  const keys = [
    "idle",
    "hold",
    "starting",
    "listening",
    "holding",
    "thinking",
    "speaking",
    "live",
    "end",
    "retry",
    "permission",
    "noMicrophone",
    "noSpeech",
  ] as const
  // Leaving voice mode (or hiding the page) silences Wappi's spoken reply.
  useEffect(() => () => speechSynthesis.cancel(), [])
  const labels = Object.fromEntries(
    keys.map((k) => [k, t(`voice.labels.${k}` as LabelKey)])
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="text-lg font-medium">{t("voice.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("voice.hint")}</p>
      </div>
      <VoiceTalk
        size={size}
        label={t("name")}
        labels={labels}
        // shortcut: no speech backend yet. The turn's audio is dropped; Wappi answers a scripted question in the chat
        // and reads the summary with the browser's voice. Return the backend's audio Response here when it lands.
        onTurn={async (_audio, { signal }) => {
          await new Promise((resolve) => setTimeout(resolve, 1200))
          if (signal.aborted) return
          send(copy("ask.devices"), "devices")
          const utterance = new SpeechSynthesisUtterance(copy("voiceReply"))
          utterance.lang = locale === "vi" ? "vi-VN" : "en-US"
          speechSynthesis.speak(utterance)
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        icon={<IconArrowLeft aria-hidden className="size-4" />}
        onClick={onBack}
      >
        {t("voice.back")}
      </Button>
    </div>
  )
}
