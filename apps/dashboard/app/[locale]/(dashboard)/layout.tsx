import { Suspense } from "react"
import { Link } from "@/i18n/navigation"

import { Skeleton } from "@workspace/ui/components/hairline/skeleton"

import { AppSidebarBody } from "@/components/layout/sidebar/app-sidebar"
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/layout/sidebar/sidebar"
import { ColumnHeader } from "@/components/layout/column-header"
import { MainHeaderStart } from "@/components/layout/header/main-header-start"
import { MainColumn } from "@/components/layout/main-column"
import { Stagger } from "@/components/shared/stagger"
import { AppLogo } from "@workspace/ui-patterns/app-logo"
import { DASHBOARD_PATH } from "@/config/routes"
import {
  CopilotNavLink,
  CopilotToggle,
} from "@/features/copilot/components/copilot-entry"
import { CopilotPanel } from "@/features/copilot/components/copilot-panel"
import { CopilotProvider } from "@/features/copilot/components/copilot-provider"

import { DashboardCrumbs } from "./_components/crumbs"
import { SessionAccount, SessionNav } from "./_components/session-nav"

/**
 * Dashboard shell (design system §8): the sidebar is a plate floating on the page (logo + trigger,
 * nav, account row); the main column has no header bar, its breadcrumb sits above the page head.
 * The static frame prerenders; session-dependent parts stream in <Suspense>.
 * No authorization here: pages call `requirePermission` next to their data. Detail views open
 * as sheets from the page itself (components/shared/detail-sheet.tsx), so the shell holds no
 * panel state, except Wappi's: its provider wraps the shell so the side panel (a third column from xl) and the
 * full page at /dashboard/copilot share one conversation.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <CopilotProvider>
        <Sidebar
          /*
          Logo left, toggle right. In the 48px icon rail the logo gives way and the toggle stays
          at the right edge (padding never changes, so nothing jumps), so the rail can be reopened. Below md the sidebar is a Sheet and the
          main header carries the toggle instead.
        */
          header={
            <ColumnHeader className="overflow-hidden px-2">
              <Link
                href={DASHBOARD_PATH}
                className="shrink-0 pl-2 group-data-[collapsible=icon]:hidden"
              >
                <AppLogo textClassName="whitespace-nowrap" />
              </Link>
              <SidebarTrigger className="ml-auto" />
            </ColumnHeader>
          }
          mobileTitle={
            <Link href={DASHBOARD_PATH}>
              <AppLogo />
            </Link>
          }
        >
          <AppSidebarBody>
            {/* Wappi first, apart from the page menu (an assistant, not a page of data), but close to it. */}
            <div className="flex flex-col gap-4">
              <Suspense fallback={<Skeleton shape="block" height={32} />}>
                <CopilotNavLink />
              </Suspense>
              {/* One AppSidebarSection per nav section (config/navigation.ts). */}
              <div className="flex flex-col gap-8 group-data-[collapsible=icon]:gap-4">
                <Suspense fallback={<NavSkeleton />}>
                  <SessionNav />
                </Suspense>
              </div>
            </div>
            {/* Account row: avatar, name, role; theme and sign out live in its panel. */}
            <div className="mt-auto flex flex-col">
              <Suspense fallback={<Skeleton shape="block" height={40} />}>
                <SessionAccount />
              </Suspense>
            </div>
          </AppSidebarBody>
        </Sidebar>
        {/* No header bar: the breadcrumb sits just above the page head, the page scrolls with the document. */}
        {/* Wappi's page is "bare" (BareMain): full height, no breadcrumb. */}
        <MainColumn>
          <MainHeaderStart>
            <div className="contents group-data-bare/main:hidden">
              <Suspense fallback={null}>
                <DashboardCrumbs />
              </Suspense>
            </div>
            {/* A box for ml-auto: the toggle's tooltip wraps the button. */}
            <div className="ml-auto shrink-0">
              <Suspense fallback={null}>
                <CopilotToggle />
              </Suspense>
            </div>
          </MainHeaderStart>
          <Stagger className="flex min-h-0 flex-1 flex-col gap-8">
            {children}
          </Stagger>
        </MainColumn>
        <Suspense fallback={null}>
          <CopilotPanel />
        </Suspense>
      </CopilotProvider>
    </SidebarProvider>
  )
}

// Fixed sizes: random widths (Math.random) are not allowed while prerendering.
function NavSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton shape="block" height={24} />
      <Skeleton shape="block" height={24} />
      <Skeleton shape="block" height={24} />
    </div>
  )
}
