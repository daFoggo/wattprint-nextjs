import { useLocale, useTranslations } from "next-intl"

import { dashboardHref } from "@/config/site"

import { EnergyButton } from "./energy-button"

/** The last ask before the footer: one sentence and the demo, on a lime plate. */
export function CtaBand() {
  const t = useTranslations("landing.cta")
  const locale = useLocale()
  return (
    <section
      aria-labelledby="cta-title"
      className="max-w-lp px-lp-gutter mx-auto w-full"
    >
      <div className="lp-cta bg-lp-lime text-lp-accent-ink flex flex-col items-start gap-8 rounded-3xl p-8 lg:flex-row lg:items-end lg:justify-between lg:p-16">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2 id="cta-title" className="text-lp-head font-medium text-balance">
            {t("title")}
          </h2>
          <p className="text-lp-body">{t("body")}</p>
        </div>
        <EnergyButton href={dashboardHref("/sign-in", locale)} tone="lime">
          {t("action")}
        </EnergyButton>
      </div>
    </section>
  )
}
