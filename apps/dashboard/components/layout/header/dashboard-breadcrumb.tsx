"use client"

import { Fragment } from "react"
import { Link } from "@/i18n/navigation"
import { usePathname } from "@/i18n/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/ui/breadcrumb"

import { breadcrumbTrail, type NavScope } from "@/config/navigation"

import { CrumbMenu } from "@/components/layout/header/crumb-menu"
import { NavIcon } from "@/components/layout/sidebar/nav-icons"
import { useNavLabel } from "@/components/layout/sidebar/nav-tree"

/** Renders `breadcrumbTrail`; below sm only the current page stays visible. */
export function DashboardBreadcrumb({
  scopes,
  names,
}: {
  scopes: NavScope[]
  /** A record's name by its id segment (see `breadcrumbTrail`). */
  names?: Record<string, string>
}) {
  const pathname = usePathname()
  const navLabel = useNavLabel()
  const crumbs = breadcrumbTrail(pathname, scopes, names).map((crumb) => ({
    ...crumb,
    label: navLabel(crumb.label),
  }))
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap text-sm">
        {crumbs.map((crumb, index) => {
          if (index === crumbs.length - 1) {
            return (
              <BreadcrumbItem key={index} className="min-w-0">
                <BreadcrumbPage className="truncate">
                  {crumb.label}
                </BreadcrumbPage>
              </BreadcrumbItem>
            )
          }
          return (
            <Fragment key={index}>
              <BreadcrumbItem className="max-sm:hidden">
                {crumb.options ? (
                  <CrumbMenu crumb={crumb} />
                ) : crumb.href ? (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>
                    {crumb.icon ? <NavIcon name={crumb.icon} /> : null}
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  crumb.label
                )}
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/50 max-sm:hidden" />
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
