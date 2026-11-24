import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { PageHead } from "@/components/layout/page-head"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { PlanHistory } from "@/features/plan/components/plan-history"
import { getPlanHistory } from "@/features/plan/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("plan.history")
  return { title: t("pageTitle") }
}

async function List() {
  const [history, t] = await Promise.all([
    getPlanHistory(),
    getTranslations("plan.history"),
  ])
  const all = history ?? []
  return <PlanHistory history={all} title={t("count", { n: all.length })} />
}

export default function PlanHistoryPage() {
  const t = useTranslations("plan.history")
  return (
    <>
      <PageHead title={t("pageTitle")}>{t("pageDescription")}</PageHead>
      <Suspense fallback={<TileSkeleton height={420} />}>
        <List />
      </Suspense>
    </>
  )
}
