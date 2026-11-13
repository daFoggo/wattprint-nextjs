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
import { Stagger } from "@/components/shared/stagger"
import { AppLogo } from "@workspace/ui-patterns/app-logo"
import { DASHBOARD_PATH } from "@/config/routes"

import { DashboardCrumbs } from "./_components/crumbs"
import { SessionAccount, SessionNav } from "./_components/session-nav"

/**
 * Dashboard shell (design system §8): the sidebar is a plate floating on the page (logo + trigger,
 * nav, account row); the main column has no header bar, its breadcrumb sits above the page head.
 * The static frame prerenders; session-dependent parts stream in <Suspense>.
 * No authorization here: pages call `requirePermission` next to their data. Detail views open
 * as sheets from the page itself (components/shared/detail-sheet.tsx), so the shell holds no
 * panel state.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
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
          {/* One AppSidebarSection per nav section (config/navigation.ts). */}
          <Suspense fallback={<NavSkeleton />}>
            <SessionNav />
          </Suspense>
          {/* Account row: avatar, name, role; theme and sign out live in its panel. */}
          <div className="mt-auto flex flex-col">
            <Suspense fallback={<Skeleton shape="block" height={40} />}>
              <SessionAccount />
            </Suspense>
          </div>
        </AppSidebarBody>
      </Sidebar>
      {/* No header bar: the breadcrumb sits just above the page head, the page scrolls with the document. */}
      <main className="flex min-w-0 flex-1 flex-col gap-3 px-4 pt-4 pb-14 sm:px-8 md:pt-8">
        <MainHeaderStart>
          <Suspense fallback={null}>
            <DashboardCrumbs />
          </Suspense>
        </MainHeaderStart>
        <Stagger className="flex flex-col gap-8">{children}</Stagger>
      </main>
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
