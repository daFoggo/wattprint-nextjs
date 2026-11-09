import Link from "next/link"

import { SidebarTrigger } from "@workspace/ui/components/sidebar"

import { AppLogo } from "@workspace/ui-patterns/app-logo"
import { DASHBOARD_PATH } from "@/config/routes"

/**
 * Left of the main header: the breadcrumb. From md the sidebar owns the toggle (Cmd/Ctrl+B works
 * too). Below md the sidebar is a Sheet, so the header carries the toggle and the logo.
 */
export function MainHeaderStart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <SidebarTrigger className="-ml-1.5 md:hidden" />
      <Link href={DASHBOARD_PATH} className="shrink-0 md:hidden">
        <AppLogo textClassName="max-sm:hidden" />
      </Link>
      <span
        aria-hidden
        className="text-sm text-muted-foreground/50 md:hidden"
      >
        /
      </span>
      {children}
    </div>
  )
}
