import { DashboardBreadcrumb } from "@/components/layout/header/dashboard-breadcrumb"
import { NAV_SCOPES } from "@/config/navigation"

/**
 * Breadcrumb for the dashboard. It reads like the path. When a scope needs names instead of raw ids, load them here
 * (a cached query shared with the pages) and pass only those names down (docs/routing-and-layouts.md §6.4).
 */
export function DashboardCrumbs() {
  return <DashboardBreadcrumb scopes={NAV_SCOPES} />
}
