"use client"

import { IconSparkles } from "@tabler/icons-react"
import dynamic from "next/dynamic"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"

import type { WappiHandle } from "@workspace/ui-patterns/wappi"

import { dashboardHref } from "@/config/site"

import { EnergyButton } from "./energy-button"
import {
  advance,
  ask,
  QUESTIONS,
  START,
  type Phase,
  type Question,
} from "./wappi-steps"

type Row = { label: string; value: string }

// The avatar (avatar-react and its character) is the band's heaviest script and draws nothing on the server: load it
// on its own after hydration instead of in the page's main chunk (Lighthouse: 2.2 s of script on mobile).
const Wappi = dynamic(
  () => import("@workspace/ui-patterns/wappi").then((m) => m.Wappi),
  { ssr: false }
)

/** The avatar states (avatar-core catalogue) the dashboard's Wappi plays for the same steps (features/copilot/moods.ts). */
const STATE: Record<Phase, string> = {
  idle: "playful",
  reading: "curious",
  working: "computing",
  done: "happy",
}
const TOOL: Record<Question, string> = {
  costliest: "controlling",
  bill: "computing",
  tier: "computing",
}
/** How long each step shows, ms: long enough to read Wappi's face, short enough not to wait. */
const READ_MS = 700
const WORK_MS = 1100
/** How long the band sits in view before Wappi asks the first question on its own. */
const AUTO_MS = 1200

const subscribeNever = () => () => {}

/**
 * Wappi on a forest band, playable: pick one of three questions and Wappi reads it, works it out and answers with the
 * demo home's real figures (the same answers it gives in the dashboard). Its head follows the pointer; a tap makes it
 * bounce. The renderer needs `window`, so the avatar mounts on the client; the answers are plain text either way.
 */
export function WappiBand() {
  const t = useTranslations("landing")
  const locale = useLocale()
  const client = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  )
  const avatar = useRef<WappiHandle>(null)
  const [step, setStep] = useState(START)
  // Announced only once the visitor has asked: the auto-demo should not talk over a screen reader unprompted.
  const [asking, setAsking] = useState(false)
  const { asked, phase, run } = step

  // Keyed on `run`, not the question: picking the same chip again replays the answer.
  useEffect(() => {
    if (run === 0) return undefined
    const work = window.setTimeout(() => setStep(advance), READ_MS)
    const done = window.setTimeout(() => {
      setStep(advance)
      avatar.current?.poke("nod")
    }, READ_MS + WORK_MS)
    return () => {
      window.clearTimeout(work)
      window.clearTimeout(done)
    }
  }, [run])

  // A demo on first sight: if the band comes into view and nobody has asked yet, Wappi asks the first question
  // itself after a beat, so the visitor sees what it does without hunting for the chips. Once only.
  const band = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = band.current
    if (!node) return undefined
    let timer = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        timer = window.setTimeout(
          () => setStep((s) => (s.run === 0 ? ask(s, QUESTIONS[0]) : s)),
          AUTO_MS
        )
      },
      { threshold: 0.5 }
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [])

  const state = phase === "working" && asked ? TOOL[asked] : STATE[phase]
  const rows = asked ? (t.raw(`wappi.examples.${asked}.rows`) as Row[]) : []

  return (
    <section
      aria-labelledby="wappi"
      className="max-w-lp px-lp-gutter mx-auto w-full"
    >
      <div
        ref={band}
        className="lp-stage-scope bg-lp-stage text-lp-stage-ink relative isolate grid grid-cols-1 gap-10 overflow-hidden rounded-3xl p-8 lg:grid-cols-12 lg:gap-16 lg:p-16"
      >
        <div className="flex flex-col gap-8 lg:col-span-5">
          <button
            type="button"
            onClick={() => avatar.current?.poke("bounce")}
            aria-label={t("wappiBand.poke")}
            className="lp-wappi focus-visible:outline-lp-lime size-40 self-start rounded-full focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {client ? (
              <Wappi
                ref={avatar}
                state={state}
                size={160}
                settleAfterMs={0}
                followPointer
                ariaLabel=""
              />
            ) : null}
          </button>
          <div className="flex flex-col gap-4">
            <h2 id="wappi" className="text-lp-head font-medium text-balance">
              {t("wappiBand.title")}
            </h2>
            <p className="text-lp-body text-lp-stage-muted">
              {t("wappiBand.body")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-7">
          <p className="text-lp-small text-lp-stage-muted flex items-center gap-2">
            <IconSparkles aria-hidden size={16} />
            {t("wappi.examplesLabel")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {QUESTIONS.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => {
                    setAsking(true)
                    setStep((s) => ask(s, q))
                  }}
                  aria-pressed={asked === q}
                  className="lp-ask text-lp-body rounded-full px-4 py-2 text-left"
                >
                  {t(`wappi.examples.${q}.question`)}
                </button>
              </li>
            ))}
          </ul>

          <div
            className="bg-lp-stage-line flex min-h-72 flex-col gap-3 rounded-2xl p-5"
            aria-live={asking ? "polite" : "off"}
          >
            {asked ? (
              <>
                <p className="bg-lp-lime text-lp-body text-lp-accent-ink self-end rounded-2xl px-4 py-3">
                  {t(`wappi.examples.${asked}.question`)}
                </p>
                {phase === "done" ? (
                  <dl key={asked} className="lp-answer flex flex-col">
                    {rows.map((row) => (
                      <div
                        key={row.label}
                        className="border-lp-stage text-lp-body flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0"
                      >
                        <dt className="text-lp-stage-muted">{row.label}</dt>
                        <dd className="text-lp-lead font-medium tabular-nums">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-lp-body text-lp-stage-muted">
                    {t(
                      phase === "working"
                        ? "wappiBand.working"
                        : "wappiBand.reading"
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="text-lp-body text-lp-stage-muted m-auto max-w-xs text-center">
                {t("wappiBand.pick")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-lp-small text-lp-stage-muted max-w-md">
              {t("wappi.note")}
            </p>
            <EnergyButton
              href={dashboardHref("/sign-in", locale)}
              tone="stage"
              size="md"
            >
              {t("wappi.fallbackAction")}
            </EnergyButton>
          </div>
        </div>
      </div>
    </section>
  )
}
