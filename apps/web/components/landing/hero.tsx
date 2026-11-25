import { useLocale, useTranslations } from "next-intl"

import { dashboardHref } from "@/config/site"

import { EnergyButton } from "./energy-button"
import { HeroTitle } from "./hero-title"
import { ProductShot } from "./product-shot"

/** First screen: the promise centred, then the real overview of a household on a forest stage. */
export function Hero() {
  const t = useTranslations("landing.hero")
  const locale = useLocale()
  return (
    <section aria-labelledby="hero-title" className="w-full">
      <div className="max-w-lp px-lp-gutter mx-auto w-full pt-16 lg:pt-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 text-center">
          <HeroTitle id="hero-title" lines={t.raw("titleLines") as string[]} />
          <p className="text-lp-body text-lp-muted max-w-xl text-pretty">
            {t("sentence")}
          </p>
          <EnergyButton href={dashboardHref("/sign-in", locale)}>
            {t("primary")}
          </EnergyButton>
        </div>
        <div className="lp-stage-rise bg-lp-stage px-lp-gutter pt-lp-gutter mt-12 overflow-hidden rounded-3xl lg:mt-16 lg:px-16 lg:pt-16">
          <div className="mx-auto aspect-16/9 max-w-6xl overflow-hidden rounded-t-2xl">
            <ProductShot
              name="dashboard"
              alt={t("shotAlt")}
              sizes="(min-width: 1280px) 1152px, 92vw"
              eager
            />
          </div>
        </div>
      </div>
    </section>
  )
}
