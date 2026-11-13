"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/hairline/button"
import { linkButton } from "@workspace/ui-patterns/link-button"

import { useLandingHref } from "@/lib/use-landing-href"

export default function AuthError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const t = useTranslations("common")
  const landing = useLandingHref()
  const tAuth = useTranslations("auth")
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-3xl leading-tight font-normal tracking-tight">
        {t("error.title")}
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {tAuth("error.description")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={() => retry()}>
          {t("tryAgain")}
        </Button>
        <a
          href={landing()}
          className={linkButton({ variant: "outline" })}
        >
          {t("backToHome")}
        </a>
      </div>
    </div>
  )
}
