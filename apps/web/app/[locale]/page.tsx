import type { Metadata } from "next"
import { Suspense } from "react"
import { getLocale, getTranslations } from "next-intl/server"

import { BillSplit } from "@/components/landing/bill-split"
import { CtaBand } from "@/components/landing/cta-band"
import { FaqSection } from "@/components/landing/faq-section"
import { FeatureSection } from "@/components/landing/feature-section"
import { Hero } from "@/components/landing/hero"
import { HowSteps } from "@/components/landing/how-steps"
import { ProofStats } from "@/components/landing/proof-stats"
import { WappiBand } from "@/components/landing/wappi-band"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { StructuredData } from "@/components/landing/structured-data"
import type { Locale } from "@/i18n/routing"
import { alternatesFor, localized, openGraphBase } from "@/lib/seo"

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations("landing.meta")
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: alternatesFor("/", locale),
    // A page's openGraph replaces the layout's whole: the shared part comes along.
    openGraph: {
      ...openGraphBase(locale, t("ogAlt")),
      title: t("title"),
      description: t("description"),
      url: localized("/", locale),
    },
  }
}

/** A section-sized box, the fallback the boundaries below never show. */
function Placeholder() {
  return <div aria-hidden className="min-h-96" />
}

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <SiteHeader />
      <main className="flex flex-col gap-28 lg:gap-40">
        <Hero />
        {/* Each boundary below the first screen hydrates on its own (React 19 selective hydration), so the page's
            hydration is several short tasks instead of one long one (Lighthouse, mobile). They never suspend: the
            HTML is prerendered, so the sized fallback is only there for the rule. */}
        <Suspense fallback={<Placeholder />}>
          <BillSplit />
        </Suspense>
        <HowSteps />
        <Suspense fallback={<Placeholder />}>
          <FeatureSection />
        </Suspense>
        <ProofStats />
        <Suspense fallback={<Placeholder />}>
          <WappiBand />
        </Suspense>
        <Suspense fallback={<Placeholder />}>
          <FaqSection />
        </Suspense>
        <CtaBand />
      </main>
      <Suspense fallback={<Placeholder />}>
        <SiteFooter />
      </Suspense>
    </>
  )
}
