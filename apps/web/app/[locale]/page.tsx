import type { Metadata } from "next"
import { useLocale, useTranslations } from "next-intl"

import { linkButton } from "@workspace/ui-patterns/link-button"

import { SiteHeader } from "@/components/site-header"
import { dashboardHref } from "@/config/site"
import { Link } from "@/i18n/navigation"

export const metadata: Metadata = {
  alternates: { languages: { vi: "/", en: "/en" } },
}

export default function HomePage() {
  const locale = useLocale()
  const t = useTranslations("landing.home")
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-5 text-center">
        <h1 className="max-w-3xl text-5xl font-medium tracking-tight text-balance sm:text-6xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
        <a href={dashboardHref("/dashboard", locale)} className={linkButton()}>
          {t("openDashboard")}
        </a>
      </main>
      <footer className="flex justify-center gap-6 py-8 text-sm text-muted-foreground">
        <Link href="/terms" className="hover:text-foreground">
          {t("terms")}
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          {t("privacy")}
        </Link>
      </footer>
    </div>
  )
}
