import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { PageHead } from "@/components/layout/page-head"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { BillOverview } from "@/features/billing/components/bill-overview"
import { PastBills } from "@/features/billing/components/past-bills"
import { TierLadder } from "@/features/billing/components/tier-ladder"
import { getBillHistory, getCurrentBill } from "@/features/billing/queries"
import { getDashboard } from "@/features/energy/queries"
import { requirePermission } from "@/lib/dal"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.bill")
  return { title: t("title") }
}

async function Guard() {
  await requirePermission("account:view")
  return null
}

/** The cycle at a glance; without a home or a tariff there is nothing to price, and it says so. */
async function Overview() {
  const [bill, history, data, t] = await Promise.all([
    getCurrentBill(),
    getBillHistory(),
    getDashboard(),
    getTranslations("layout.bill"),
  ])
  if (!bill || !data) {
    return (
      <section className="flex flex-col gap-2 rounded-3xl border bg-background p-6 lg:col-span-12">
        <h2 className="text-base font-medium">{t("emptyTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
      </section>
    )
  }
  return (
    <BillOverview
      bill={bill}
      now={data.now}
      lastMonth={history?.at(-1)}
      className="lg:col-span-12"
    />
  )
}

async function Ladder({ className }: { className: string }) {
  const bill = await getCurrentBill()
  return bill ? <TierLadder bill={bill} className={className} /> : null
}

async function Past({ className }: { className: string }) {
  const history = await getBillHistory()
  return history ? <PastBills bills={history} className={className} /> : null
}

// The cycle so far, where it ends and the next tier 12; then every tier 7 | the last bills 5, each streaming on its own.
export default function BillPage() {
  const t = useTranslations("layout.bill")
  return (
    <>
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
      <PageHead title={t("title")}>{t("description")}</PageHead>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Suspense
          fallback={<TileSkeleton height={200} className="lg:col-span-12" />}
        >
          <Overview />
        </Suspense>
        <Suspense
          fallback={<TileSkeleton height={420} className="lg:col-span-7" />}
        >
          <Ladder className="lg:col-span-7" />
        </Suspense>
        <Suspense
          fallback={<TileSkeleton height={420} className="lg:col-span-5" />}
        >
          <Past className="lg:col-span-5" />
        </Suspense>
      </div>
    </>
  )
}
