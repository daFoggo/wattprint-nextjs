"use client"

import { IconArrowLeft } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"
import {
  useVoiceSession,
  type VoicePhase,
} from "@workspace/ui/components/hairline/voice-session"
import { VoiceTalk } from "@workspace/ui/components/hairline/voice-talk"

import { speechUrl, transcribeAudio } from "../voice"
import { useCopilot } from "./copilot-provider"
import { MOODS } from "../moods"
import { WappiAvatar, useWappiState } from "./wappi-avatar"

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
  const { send } = useCopilot()
  const chat = useWappiState()
  // One turn: the recording to text (backend), the question through the chat (so it stays in the history), the
  // answer read in Wappi's voice. VoiceTalk plays the voice as it streams in and stops it on Interrupt.
  const session = useVoiceSession({
    onTurn: async (audio, { signal }) => {
      const question = await transcribeAudio(audio, locale, signal)
      if (!question || signal.aborted) return
      const answer = await send(question)
      if (!answer || signal.aborted) return
      return speechUrl(answer, locale) // played as it streams in
    },
  })
  const faces: Record<VoicePhase, string> = {
    idle: chat,
    starting: MOODS.listening,
    listening: MOODS.listening,
    thinking: chat === MOODS.idle ? MOODS.transcribing : chat, // the words, then the answer's own face
    speaking: MOODS.speaking,
    error: MOODS.failed,
  }
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
  const labels = Object.fromEntries(
    keys.map((k) => [k, t(`voice.labels.${k}` as LabelKey)])
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
      <div className="flex max-w-sm flex-col items-center gap-2">
        <WappiAvatar size="xl" state={faces[session.phase]} live />
        <h2 className="text-lg font-medium">{t("voice.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("voice.hint")}</p>
      </div>
      <VoiceTalk
        size={size}
        label={t("name")}
        labels={labels}
        session={session}
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
