import type { Metadata } from "next"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"
import { IconScale, IconAlertTriangle } from "@tabler/icons-react"


import { CONTAINER } from "@/config/layout"
import { SiteHeader } from "@/components/site-header"

// Noon UTC keeps the same calendar day whatever the server's time zone.
const LAST_UPDATED = new Date("2026-01-01T12:00:00Z")
const ACCOUNT_RULES = ["accurate", "confidential", "notify", "responsible"] as const
const PROHIBITED = ["laws", "security", "abuse"] as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms.meta")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { languages: { vi: "/terms", en: "/en/terms" } },
  }
}

export default function TermsOfServicePage() {
  const t = useTranslations("legal.terms")
  return (
    <>
      <SiteHeader />

      <main className={`${CONTAINER} py-12 sm:py-16`}>
        <article className="mx-auto flex max-w-3xl flex-col gap-10">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 font-mono text-xs text-foreground">
                <IconScale className="size-3.5 text-primary" />
                {t("badge")}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {t("lastUpdated", { date: LAST_UPDATED })}
              </span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              {t("title")}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t("intro")}
            </p>
          </div>

          {/* Section 1: Open Source & License */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("license.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("license.body")}
            </p>
          </section>

          {/* Section 2: User Accounts */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("accounts.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("accounts.body")}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground leading-relaxed">
              {ACCOUNT_RULES.map((key) => (
                <li key={key}>{t(`accounts.items.${key}`)}</li>
              ))}
            </ul>
          </section>

          {/* Section 3: Acceptable Use */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("acceptableUse.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("acceptableUse.body")}
            </p>
            <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 text-xs text-muted-foreground">
              {PROHIBITED.map((key) => (
                <div key={key} className="flex items-start gap-2">
                  <IconAlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>{t(`acceptableUse.items.${key}`)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Multi-Tenant Workspace Rules */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("workspace.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("workspace.body")}
            </p>
          </section>

          {/* Section 5: Limitation of Liability */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("liability.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("liability.body")}
            </p>
          </section>

          {/* Section 6: Termination & Erasure */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("termination.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("termination.body")}
            </p>
          </section>

          {/* Section 7: Governing Law */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("law.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("law.body")}
            </p>
          </section>
        </article>
      </main>
    </>
  )
}
