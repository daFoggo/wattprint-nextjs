import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { BareMain } from "@/components/layout/main-column"
import { CopilotWorkspace } from "@/features/copilot/components/copilot-workspace"
import { requirePermission } from "@/lib/dal"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("copilot")
  return { title: t("name") }
}

async function Guard() {
  await requirePermission("account:view")
  return null
}

/** Wappi, full size: no page head and no breadcrumb (BareMain), the chat fills the column. */
export default function CopilotPage() {
  return (
    <>
      <BareMain />
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
      <CopilotWorkspace />
    </>
  )
}
