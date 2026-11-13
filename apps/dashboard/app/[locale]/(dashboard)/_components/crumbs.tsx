import { DashboardBreadcrumb } from "@/components/layout/header/dashboard-breadcrumb"
import { NAV_SCOPES } from "@/config/navigation"
import { getDevices } from "@/features/energy/queries"

/**
 * Breadcrumb for the dashboard. It reads like the path; a device's page shows the device's name, from the same
 * per-request read as the pages (docs/routing-and-layouts.md §6.4). Without a home there are no names.
 */
export async function DashboardCrumbs() {
  const devices = (await getDevices()) ?? []
  return (
    <DashboardBreadcrumb
      scopes={NAV_SCOPES}
      names={Object.fromEntries(devices.map((d) => [d.id, d.name]))}
    />
  )
}
