import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { PageHead } from "@/components/layout/page-head"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { getDashboard } from "@/features/energy/queries"
import { saveHomeSettingsAction } from "@/features/home/actions"
import { HomeSettingsForm } from "@/features/home/components/home-settings"
import { getHomeSettings } from "@/features/home/queries"
import { ThresholdTry } from "@/features/insight/components/threshold-try"

import { NoHome } from "../../_components/no-home"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.settings")
  return { title: t("title") }
}

/** The home's settings; without a home there is nothing to set. */
async function Settings() {
  const [data, settings] = await Promise.all([
    getDashboard(),
    getHomeSettings(),
  ])
  if (!data) return <NoHome />
  return (
    <HomeSettingsForm settings={settings} action={saveHomeSettingsAction} />
  )
}

/** A daily limit to try against the last 30 whole days (the alert it would set). */
async function Threshold() {
  const data = await getDashboard()
  return data ? <ThresholdTry days={data.days.slice(0, -1)} /> : null
}

// The form 7 | the limit to try 5, each streaming on its own.
export default function SettingsPage() {
  const t = useTranslations("layout.settings")
  return (
    <>
      <PageHead title={t("title")}>{t("description")}</PageHead>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <Suspense fallback={<TileSkeleton height={600} />}>
            <Settings />
          </Suspense>
        </div>
        <div className="min-w-0 empty:hidden lg:col-span-5">
          <Suspense fallback={<TileSkeleton height={280} />}>
            <Threshold />
          </Suspense>
        </div>
      </div>
    </>
  )
}
