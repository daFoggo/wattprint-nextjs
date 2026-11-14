import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { MainHeaderStart } from "@/components/layout/header/main-header-start"
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

/**
 * Wappi, full size: its own main column, outside (pages), so no breadcrumb and no page head. It fills the viewport
 * (only the chat scrolls, the composer stays at the bottom) with its plate on the sidebar's 8px frame. Below md the
 * row with the sidebar toggle and the logo stays.
 */
export default function CopilotPage() {
  return (
    <main className="flex h-svh min-w-0 flex-1 flex-col gap-3 p-2 md:pl-0">
      <div className="px-2 md:hidden">
        <MainHeaderStart />
      </div>
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
      <CopilotWorkspace />
    </main>
  )
}
