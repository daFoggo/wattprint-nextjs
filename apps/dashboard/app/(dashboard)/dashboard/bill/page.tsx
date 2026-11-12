import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@workspace/ui/components/hairline/skeleton"

import { PageHead } from "@/components/layout/page-head"
import { BillCard } from "@/features/billing/components/bill-card"
import { getCurrentBill } from "@/features/billing/queries"
import { requirePermission } from "@/lib/dal"

export const metadata: Metadata = { title: "Bill" }

async function Guard() {
  await requirePermission("account:view")
  return null
}

/** Without a home or a tariff there is nothing to price. */
async function Bill() {
  const bill = await getCurrentBill()
  if (!bill) {
    return (
      <section className="flex flex-col gap-2 rounded-3xl bg-card p-6">
        <h2 className="text-base font-medium">No bill yet</h2>
        <p className="text-sm text-muted-foreground">
          This account has no home with a tariff plan to price its energy.
        </p>
      </section>
    )
  }
  return <BillCard bill={bill} />
}

export default function BillPage() {
  return (
    <>
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
      <PageHead title="Bill">
        This billing cycle so far, priced tier by tier as the electricity
        company will.
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
