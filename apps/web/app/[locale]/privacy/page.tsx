import type { Metadata } from "next"
import { useTranslations } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"
import { IconShieldCheck, IconClock, IconFileCheck } from "@tabler/icons-react"

import { CONTAINER } from "@/config/layout"
import { SiteHeader } from "@/components/site-header"
import type { Locale } from "@/i18n/routing"
import { alternatesFor } from "@/lib/seo"

// Noon UTC keeps the same calendar day whatever the server's time zone.
const EFFECTIVE = new Date("2026-11-25T12:00:00Z")
const COLLECTED = [
  "account",
  "session",
  "home",
  "energy",
  "assistant",
  "voice",
  "guest",
] as const
const SHARING = ["ai", "voice", "weather", "google"] as const
const BASES = ["contract", "consent", "interests", "statutory"] as const
const COOKIES = ["session", "language", "theme"] as const
const RETENTION = ["readings", "rollups", "account", "guest"] as const
const RIGHTS = ["access", "correct", "withdraw", "erase", "complain"] as const
const AI_RULES = ["automated", "estimates", "providers", "training"] as const

const rich = {
  strong: (chunks: React.ReactNode) => (
    <strong className="font-medium text-foreground">{chunks}</strong>
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
    alternates: alternatesFor("/privacy", (await getLocale()) as Locale),
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
            <p className="text-base leading-relaxed text-muted-foreground">
              {t("intro")}
            </p>
          </div>

          {/* Section 1: Who is responsible */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">
              {t("controller.title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("controller.body")}
            </p>
            <div className="rounded-2xl bg-card p-4 font-mono text-xs text-foreground">
              <p>{t("controller.name")}</p>
              <p>{t("controller.email")}</p>
            </div>
          </section>

          {/* Section 2: Data We Collect */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">
              {t("collected.title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("collected.body")}
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              {COLLECTED.map((key) => (
                <li key={key}>{t.rich(`collected.items.${key}`, rich)}</li>
              ))}
            </ul>
          </section>

          {/* Section 3: Who receives it */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">
              {t("sharing.title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("sharing.body")}
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              {SHARING.map((key) => (
                <li key={key}>{t.rich(`sharing.items.${key}`, rich)}</li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("sharing.abroad")}
            </p>
          </section>

          {/* Section 4: Purposes and Legal Grounds */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">
              {t("bases.title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("bases.body")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BASES.map((key) => (
                <div key={key} className="rounded-2xl bg-card p-4">
                  <span className="font-mono text-xs font-medium tracking-wider text-foreground uppercase">
                    {t(`bases.${key}.title`)}
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t(`bases.${key}.body`)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Cookies and browser storage */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">
              {t("cookies.title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("cookies.body")}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {COOKIES.map((key) => (
                <li key={key}>{t.rich(`cookies.items.${key}`, rich)}</li>
              ))}
            </ul>
          </section>

          {/* Section 6: Retention */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <IconClock className="size-4 text-primary" />
              <h2 className="text-xl font-medium text-foreground">
                {t("retention.title")}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("retention.body")}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {RETENTION.map((key) => (
                <li key={key}>{t(`retention.items.${key}`)}</li>
              ))}
            </ul>
          </section>

          {/* Section 7: Rights */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">
              {t("rights.title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("rights.body")}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {RIGHTS.map((key) => (
                <li key={key}>{t(`rights.items.${key}`)}</li>
              ))}
            </ul>
          </section>

          {/* Section 8: Account Deletion */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <IconFileCheck className="size-4 text-primary" />
              <h2 className="text-xl font-medium text-foreground">
                {t("deletion.title")}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t.rich("deletion.body", rich)}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("deletion.limit")}
            </p>
          </section>

          {/* Section 9: The assistant and automated processing */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-foreground">
              {t("ai.title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("ai.body")}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
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
