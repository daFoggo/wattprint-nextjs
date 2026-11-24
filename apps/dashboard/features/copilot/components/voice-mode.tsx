"use client"

import { useEffect, useRef } from "react"
import { IconArrowLeft } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"
import { DitherHorizon } from "@workspace/ui/components/hairline/dither-horizon"
import { useInteractionReducedMotion } from "@workspace/ui/components/hairline/motion"
import {
  useVoiceSession,
  type VoicePhase,
} from "@workspace/ui/components/hairline/voice-session"
import { VoiceTalk } from "@workspace/ui/components/hairline/voice-talk"

import { speechUrl, transcribeAudio } from "../voice"
import { useCopilot } from "./copilot-provider"
import { MOODS } from "../moods"
import { WappiAvatar, useWappiState } from "./wappi-avatar"

// The dither field in the brand green: Wappi's own colour, both themes.
const FIELD = ["var(--chart-1)", "var(--primary)"] as const

/**
 * Voice mode: Hairline's VoiceTalk (its one morphing button: Talk, Send, Thinking, Interrupt; microphone handling and
 * end-of-speech detection) with Wappi where its orb was, over Hairline's DitherHorizon (voice-bar) driven by the same
 * session: the field rises with the microphone or Wappi's voice, and Wappi bobs to its loudness. Each turn also lands
 * in the chat, so nothing said is lost.
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

  // Wappi bobs to the loudness of whoever is talking, read each frame (no re-render).
  const reduced = useInteractionReducedMotion()
  const body = useRef<HTMLSpanElement>(null)
  const { getLevel } = session
  const loud = session.phase === "listening" || session.phase === "speaking"
  useEffect(() => {
    const el = body.current
    if (!el || !loud || reduced) return
    let frame = 0
    const tick = () => {
      const level = Math.min(1, getLevel())
      el.style.transform = `translateY(${-level * 6}px) scale(${1 + level * 0.06})`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      el.style.transform = ""
    }
  }, [loud, reduced, getLevel])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
      <div className="flex max-w-sm flex-col items-center gap-2">
        <h2 className="text-lg font-medium">{t("voice.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("voice.hint")}</p>
      </div>
      <VoiceTalk
        visual={
          <div
            role="img"
            aria-label={t("name")}
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
          >
            <DitherHorizon
              state={session.state}
              getLevel={session.getLevel}
              getSpectrum={session.getSpectrum}
              shape="card"
              colors={FIELD}
            />
            <span ref={body} className="relative">
              <WappiAvatar
                size={Math.round(size * 0.56)}
                state={faces[session.phase]}
                live
              />
            </span>
          </div>
        }
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
