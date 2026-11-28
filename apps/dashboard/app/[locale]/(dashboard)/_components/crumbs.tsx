import { DashboardBreadcrumb } from "@/components/layout/header/dashboard-breadcrumb"
import { NAV_SCOPES } from "@/config/navigation"
import { getDevices } from "@/features/energy/queries"
import { at, formats } from "@/features/plan/components/plan-data"
import { getPlanHistory } from "@/features/plan/queries"
import { getLocale, getTranslations } from "next-intl/server"

/**
 * Breadcrumb for the dashboard. It reads like the path; a device's page shows the device's name and a past plan's
 * its dates, from the same per-request reads as the pages (docs/routing-and-layouts.md §6.4). Without a home there are no names.
 */
export async function DashboardCrumbs() {
  // A failed read costs the crumb its record names, not every page under this layout.
  const [devices, plans, locale, privacy] = await Promise.all([
    getDevices().catch(() => null),
    getPlanHistory().catch(() => null),
    getLocale(),
    getTranslations("privacy"),
  ])
  const f = formats(locale)
  return (
    <DashboardBreadcrumb
      scopes={NAV_SCOPES}
      names={Object.fromEntries([
        ["privacy", privacy("title")], // a page the nav does not list
        ...(devices ?? []).map((d) => [d.id, d.name]),
        // A past plan by its dates (`plan / 15/10 – 14/11`), as its page title.
        ...(plans ?? []).map((p) => [
          p.id,
          `${f.date.format(at(p.start_on))} – ${f.dateYear.format(at(p.end_on))}`,
        ]),
      ])}
    />
  )
}
