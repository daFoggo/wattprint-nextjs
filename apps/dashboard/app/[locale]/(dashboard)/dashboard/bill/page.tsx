import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { Skeleton } from "@workspace/ui/components/hairline/skeleton"

import { PageHead } from "@/components/layout/page-head"
import { BillCard } from "@/features/billing/components/bill-card"
import { getCurrentBill } from "@/features/billing/queries"
import { requirePermission } from "@/lib/dal"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.bill")
  return { title: t("title") }
}

async function Guard() {
  await requirePermission("account:view")
  return null
}

/** Without a home or a tariff there is nothing to price. */
async function Bill() {
  const bill = await getCurrentBill()
  if (!bill) {
    const t = await getTranslations("layout.bill")
    return (
      <section className="flex flex-col gap-2 rounded-3xl bg-card p-6">
        <h2 className="text-base font-medium">{t("emptyTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("emptyDescription")}
        </p>
      </section>
    )
  }
  return <BillCard bill={bill} />
}

export default function BillPage() {
  const t = useTranslations("layout.bill")
  return (
    <>
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
      <PageHead title={t("title")}>
        {t("description")}
      </PageHead>
      <div className="max-w-3xl">
        <Suspense
          fallback={
            <div className="rounded-3xl bg-card p-6">
              <Skeleton shape="block" height={480} />
            </div>
          }
        >
          <Bill />
        </Suspense>
      </div>
    </>
  )
}
