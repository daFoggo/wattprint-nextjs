"use client"

import { useTranslations } from "next-intl"

import { Tile } from "@/components/shared/tile"
import { useLandingHref } from "@/lib/use-landing-href"

export function HowAi() {
  const t = useTranslations("privacy.ai")
  const landing = useLandingHref()
  return (
    <Tile title={t("title")}>
      <div className="flex max-w-2xl flex-col gap-3 text-sm">
        <p>{t("devices")}</p>
        <p>{t("wappi")}</p>
        <a
          href={landing("/privacy")}
          target="_blank"
          rel="noreferrer"
          className="self-start underline underline-offset-4 hover:text-muted-foreground"
        >
          {t("policy")}
        </a>
      </div>
    </Tile>
  )
}
