import { useTranslations } from "next-intl"

import { linkButton } from "@workspace/ui-patterns/link-button"

import { useLandingHref } from "@/lib/use-landing-href"

export default function NotFound() {
  const t = useTranslations("common")
  const landing = useLandingHref()
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 p-6 text-center">
      <h1 className="text-5xl leading-tight font-normal tracking-tighter">
        {t("notFound.title")}
      </h1>
      <p className="text-muted-foreground">
        {t("notFound.description")}
      </p>
      <a href={landing()} className={linkButton()}>
        {t("backToHome")}
      </a>
    </main>
  )
}
