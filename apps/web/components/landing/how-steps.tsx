import { IconCoin, IconCpu, IconPlugConnected } from "@tabler/icons-react"
import type { CSSProperties } from "react"
import { useTranslations } from "next-intl"

import { SectionHead } from "./section-head"

type Step = { title: string; body: string }
const ICONS = [IconPlugConnected, IconCpu, IconCoin] as const

/** How it works: breaker, model, money. Three columns on wide screens, a list on phones. */
export function HowSteps() {
  const t = useTranslations("landing.how")
  const steps = t.raw("steps") as Step[]
  return (
    <section
      aria-labelledby="how"
      className="max-w-lp px-lp-gutter mx-auto flex w-full flex-col gap-12"
    >
      <SectionHead
        id="how"
        title={t("title")}
        muted={t("muted")}
        body={t("body")}
      />
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((step, i) => {
          const StepIcon = ICONS[i] ?? IconCoin
          return (
            <li key={step.title}>
              {/* The cards rise in one after another as the row scrolls in (landing.css, `.lp-reveal`, CSS only). */}
              <div
                className="lp-reveal bg-lp-surface flex h-full flex-col gap-10 rounded-3xl p-8"
                style={{ "--i": i } as CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <StepIcon
                    aria-hidden
                    size={36}
                    stroke={1.5}
                    className="text-lp-accent"
                  />
                  <span className="text-lp-small text-lp-muted tabular-nums">
                    {i + 1}/{steps.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lp-lead text-lp-ink font-medium">
                    {step.title}
                  </h3>
                  <p className="text-lp-body text-lp-muted">{step.body}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
