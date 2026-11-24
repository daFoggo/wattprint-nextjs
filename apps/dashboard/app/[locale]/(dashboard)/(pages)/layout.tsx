import { Suspense } from "react"

import { MainHeaderStart } from "@/components/layout/header/main-header-start"
import { Stagger } from "@/components/shared/stagger"
import { CopilotToggle } from "@/features/copilot/components/copilot-entry"

import { DashboardCrumbs } from "../_components/crumbs"
import { DemoViewer } from "../_components/demo-viewer"

/** The main column of the dashboard's pages: no header bar, the breadcrumb sits just above the page head and the page
 * scrolls with the document. Wappi's page has its own column ((chat)). */
export default function PagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-3 px-4 pt-4 pb-14 sm:px-8 md:pt-8">
      <MainHeaderStart>
        <Suspense fallback={null}>
          <DashboardCrumbs />
        </Suspense>
        {/* A box for ml-auto: the toggle's tooltip wraps the button. */}
        <div className="ml-auto shrink-0">
          <Suspense fallback={null}>
            <CopilotToggle />
          </Suspense>
        </div>
      </MainHeaderStart>
      {/* null: the strip is there only for a demo viewer, so nothing holds its place. */}
      <Suspense fallback={null}>
        <DemoViewer />
      </Suspense>
      <Stagger className="flex flex-col gap-8">{children}</Stagger>
    </main>
  )
}
