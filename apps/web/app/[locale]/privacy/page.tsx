import type { Metadata } from "next"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"
import { IconShieldCheck, IconClock, IconFileCheck } from "@tabler/icons-react"


import { CONTAINER } from "@/config/layout"
import { SiteHeader } from "@/components/site-header"

// Noon UTC keeps the same calendar day whatever the server's time zone.
const EFFECTIVE = new Date("2026-01-01T12:00:00Z")
const COLLECTED = ["account", "session", "workspace"] as const
const BASES = ["contract", "consent", "interests", "statutory"] as const
const COOKIES = ["session", "theme"] as const
const RIGHTS = [
  ["acknowledge", 2],
  ["access", 10],
  ["withdraw", 15],
  ["erasure", 20],
] as const
const AI_RULES = ["disclosure", "human", "training"] as const

const rich = {
  strong: (chunks: React.ReactNode) => (
    <strong className="text-foreground font-medium">{chunks}</strong>
  ),
  code: (chunks: React.ReactNode) => (
    <code className="font-mono text-xs">{chunks}</code>
  ),
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy.meta")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { languages: { vi: "/privacy", en: "/en/privacy" } },
  }
}

export default function PrivacyPolicyPage() {
  const t = useTranslations("legal.privacy")
  return (
    <>
      <SiteHeader />

      <main className={`${CONTAINER} py-12 sm:py-16`}>
        <article className="mx-auto flex max-w-3xl flex-col gap-10">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 font-mono text-xs text-foreground">
                <IconShieldCheck className="size-3.5 text-foreground" />
                {t("badge")}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {t("effective", { date: EFFECTIVE })}
              </span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              {t("title")}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t("intro")}
            </p>
          </div>

          {/* Section 1: Data Controller */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("controller.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("controller.body")}
            </p>
            <div className="rounded-2xl bg-card p-4 font-mono text-xs text-foreground">
              <p>{t("controller.organization")}</p>
              <p>{t("controller.email")}</p>
              <p>{t("controller.support")}</p>
            </div>
          </section>

          {/* Section 2: Data We Collect */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("collected.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("collected.body")}
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground leading-relaxed">
              {COLLECTED.map((key) => (
                <li key={key}>{t.rich(`collected.items.${key}`, rich)}</li>
              ))}
            </ul>
          </section>

          {/* Section 3: Purposes and Legal Grounds */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("bases.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("bases.body")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BASES.map((key) => (
                <div key={key} className="rounded-2xl bg-card p-4">
                  <span className="font-medium text-xs text-foreground uppercase tracking-wider font-mono">{t(`bases.${key}.title`)}</span>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {t(`bases.${key}.body`)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Cross-Border Transfers */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("transfers.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("transfers.body")}
            </p>
          </section>

          {/* Section 5: Cookies and Tracking */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("cookies.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("cookies.body")}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground leading-relaxed">
              {COOKIES.map((key) => (
                <li key={key}>{t.rich(`cookies.items.${key}`, rich)}</li>
              ))}
            </ul>
          </section>

          {/* Section 6: User Rights & Concrete SLA (Key compliance item) */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <IconClock className="size-4 text-primary" />
              <h2 className="text-xl font-medium text-foreground">{t("rights.title")}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("rights.body")}
            </p>
            <div className="flex flex-col divide-y divide-border rounded-2xl bg-card font-mono text-xs">
              {RIGHTS.map(([key, days]) => (
                <div key={key} className="flex items-center justify-between p-3.5">
                  <span className="text-foreground">{t(`rights.items.${key}`)}</span>
                  <span className="font-medium text-foreground">{t("rights.within", { days })}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7: Account Deletion */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <IconFileCheck className="size-4 text-primary" />
              <h2 className="text-xl font-medium text-foreground">{t("deletion.title")}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.rich("deletion.body", rich)}
            </p>
          </section>

          {/* Section 8: AI Transparency & Processing (Law 134/2025/QH15) */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">{t("ai.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("ai.body")}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground leading-relaxed">
              {AI_RULES.map((key) => (
                <li key={key}>{t.rich(`ai.items.${key}`, rich)}</li>
              ))}
            </ul>
          </section>
        </article>
      </main>
    </>
  )
}
