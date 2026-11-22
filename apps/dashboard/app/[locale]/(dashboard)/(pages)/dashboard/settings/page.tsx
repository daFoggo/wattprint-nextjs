import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { PageHead } from "@/components/layout/page-head"
import { ALERTS_PATH } from "@/config/routes"
import { Link } from "@/i18n/navigation"
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
  const [settings, provinces] = await Promise.all([
    getHomeSettings(),
    getProvinces(),
  ])
  if (!settings) return <NoHome />
  return (
    <HomeSettingsForm
      {...settings}
      provinces={provinces}
      action={saveHomeSettingsAction}
    />
  )
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
        <p className="text-sm text-muted-foreground lg:col-span-5">
          {t.rich("alertsMoved", {
            alerts: (chunks) => (
              <Link href={ALERTS_PATH} className="text-foreground underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </>
  )
}
