import Link from "next/link"
import { IconChevronRight } from "@tabler/icons-react"

import { SidebarTrigger } from "@/components/layout/sidebar/sidebar"
import { AppLogo } from "@workspace/ui-patterns/app-logo"
import { DASHBOARD_PATH } from "@/config/routes"

/**
 * Top row of the main column: the breadcrumb, small, above the page head. From md the sidebar owns
 * the toggle (Cmd/Ctrl+B works too). Below md the sidebar is a Sheet, so this row carries the toggle and the logo.
 */
export function MainHeaderStart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 min-w-0 items-center gap-2">
      <SidebarTrigger className="-ml-1.5 md:hidden" />
      <Link href={DASHBOARD_PATH} className="shrink-0 md:hidden">
        <AppLogo textClassName="max-sm:hidden" />
      </Link>
      <IconChevronRight
        aria-hidden
        className="size-3.5 shrink-0 text-muted-foreground/50 md:hidden"
      />
      {children}
    </div>
  )
}
