import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { PageHead } from "@/components/layout/page-head"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { saveHomeSettingsAction } from "@/features/home/actions"
import { HomeSettingsForm } from "@/features/home/components/home-settings"
import { getHomeSettings, getProvinces } from "@/features/home/queries"

import { NoHome } from "../../../_components/no-home"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.settings")
  return { title: t("title") }
}

/** The home's settings; without a home there is nothing to set. */
async function Settings() {
  // The session first: the prerender stops there, so the cached provinces never fetch at build (no backend in CI).
  const settings = await getHomeSettings()
  if (!settings) return <NoHome />
  const provinces = await getProvinces()
  return (
    <HomeSettingsForm
      {...settings}
      provinces={provinces}
      action={saveHomeSettingsAction}
    />
  )
}

// The form alone: alerts live on their own page.
export default function SettingsPage() {
  const t = useTranslations("layout.settings")
  return (
    <>
      <PageHead title={t("title")}>{t("description")}</PageHead>
      <Suspense fallback={<TileSkeleton height={600} />}>
        <Settings />
      </Suspense>
    </>
  )
}
