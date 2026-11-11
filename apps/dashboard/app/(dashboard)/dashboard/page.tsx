import type { Metadata } from "next"
import { Suspense } from "react"

import { PageHead } from "@/components/layout/page-head"
import { BackendStatus } from "@/features/profile/components/backend-status"
import { getMe } from "@/features/profile/queries"
import { requirePermission } from "@/lib/dal"

export const metadata: Metadata = { title: "Overview" }

async function Backend() {
  return <BackendStatus me={await getMe()} />
}

async function Guard() {
  await requirePermission("account:view")
  return null
}

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
      <PageHead title="Overview" />
      <Suspense fallback={null}>
        <Backend />
      </Suspense>
    </>
  )
}
