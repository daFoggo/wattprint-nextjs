"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/hairline/button"
import { linkButton } from "@workspace/ui-patterns/link-button"

import { useLandingHref } from "@/lib/use-landing-href"

/** Unexpected errors only; expected failures are returned by Server Actions as values. */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const t = useTranslations("common")
  const landing = useLandingHref()
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl leading-tight font-normal tracking-tight max-sm:text-3xl">
        {t("error.title")}
      </h1>
      <p className="max-w-md text-muted-foreground">
        {t("error.description")}
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
    </main>
  )
}
