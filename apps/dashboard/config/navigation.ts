import type { Permission } from "@workspace/auth/permissions"

import { BILL_PATH, DASHBOARD_PATH } from "@/config/routes"

/**
 * Semantic icon names, resolved to Tabler icons in `components/layout/sidebar/nav-icons.tsx`. Names (not
 * components) because `entries` cross from a Server Component to the client `NavTree`.
 */
export type NavIconName = "overview" | "bill" | "settings"

export type NavLink = {
  /** Message key in `layout.nav`, translated at render; unknown keys show as is. */
  title: string
  /** May hold `:param` placeholders (see `NavScope.param`), filled from the URL. */
  href: string
  icon: NavIconName
  permission: Permission
  /** Short mono text on the right, e.g. "due". Set at render time, not in the config. */
  badge?: string
  /**
   * Per-link prefetching (`<Link prefetch>`) for pages that read `searchParams`: URL data is not
   * in the shared App Shell, so without it their data waits for the click. Costs one server call per link.
   */
  prefetch?: true
}
/** A collapsible group inside a section; the tree stays at most two levels deep. */
export type NavGroup = { title: string; items: NavLink[] }
export type NavEntry = NavLink | NavGroup
/** One labelled block of the sidebar (`label` is a `layout.nav` key). Add sections freely; empty ones are hidden. */
export type NavSection = { label: string; entries: NavEntry[] }

/**
 * One sidebar menu, chosen by the URL. A scope with a `prefix` owns every
 * path under `<prefix>/<param value>`; the scope without one is the fallback. Plain data, so a
 * Server Component can filter it and hand it to the client (docs/routing-and-layouts.md §6.4).
 */
export type NavScope = {
  id: string
  prefix?: string
  /** Name of the URL segment after `prefix`, used as `:param` in hrefs. */
  param?: string
  sections: NavSection[]
}

/** `permission` only hides links; each page still calls `requirePermission`. */
export const NAV_SCOPES: NavScope[] = [
  {
    id: "global",
    sections: [
      {
        label: "dashboard",
        entries: [
          {
            title: "overview",
            href: DASHBOARD_PATH,
            icon: "overview",
            permission: "account:view",
          },
          {
            title: "bill",
            href: BILL_PATH,
            icon: "bill",
            permission: "account:view",
          },
        ],
      },
    ],
  },
]

export type ResolvedScope = {
  scope: NavScope
  /** URL values by `param` name, e.g. `{ customerId: "42" }`. */
  params: Record<string, string>
}

/** The scope a pathname belongs to (the fallback when no prefix matches) and its URL params. */
export function resolveScope(
  scopes: NavScope[],
  pathname: string
): ResolvedScope | undefined {
  for (const scope of scopes) {
    if (!scope.prefix || !scope.param) continue
    if (!pathname.startsWith(`${scope.prefix}/`)) continue
    const value = pathname.slice(scope.prefix.length + 1).split("/")[0]
    if (value) {
      return { scope, params: { [scope.param]: decodeURIComponent(value) } }
    }
  }
  const fallback = scopes.find((scope) => !scope.prefix)
  return fallback && { scope: fallback, params: {} }
}

/** Fills `:param` placeholders in an href. */
export function fillHref(href: string, params: Record<string, string>) {
  return href.replace(/:(\w+)/g, (match, name: string) =>
    name in params ? encodeURIComponent(params[name]!) : match
  )
}

/** Sections of the pathname's scope with real hrefs. */
export function sectionsFor(
  scopes: NavScope[],
  pathname: string
): NavSection[] {
  const resolved = resolveScope(scopes, pathname)
  if (!resolved) return []
  const { scope, params } = resolved
  const fill = (link: NavLink): NavLink => ({
    ...link,
    href: fillHref(link.href, params),
  })
  return scope.sections.map((section) => ({
    ...section,
    entries: section.entries.map((entry) =>
      "items" in entry
        ? { ...entry, items: entry.items.map(fill) }
        : fill(entry)
    ),
  }))
}

/**
 * Keeps the links `can` allows and drops groups or sections left empty. Takes a predicate so
 * this module stays free of auth code and is safe to import from client components.
 */
export function filterNav(
  scopes: NavScope[],
  can: (permission: Permission) => boolean
): NavScope[] {
  return scopes.map((scope) => ({
    ...scope,
    sections: scope.sections.flatMap((section) => {
      const entries = section.entries.flatMap<NavEntry>((entry) => {
        if (!("items" in entry)) return can(entry.permission) ? [entry] : []
        const items = entry.items.filter((item) => can(item.permission))
        return items.length ? [{ ...entry, items }] : []
      })
      return entries.length ? [{ ...section, entries }] : []
    }),
  }))
}

function navLinks(sections: NavSection[]): NavLink[] {
  return sections.flatMap((section) =>
    section.entries.flatMap((entry) =>
      "items" in entry ? entry.items : [entry]
    )
  )
}

export type CrumbOption = { label: string; href: string }
export type Crumb = {
  label: string
  icon?: NavIconName
  href?: string
  /** Makes the crumb a menu that jumps to a sibling (another customer, say). */
  options?: CrumbOption[]
}

/**
 * Breadcrumb from the URL: it reads like the path (`dashboard / settings`). A segment links when a nav link
 * points at it, and the last crumb is the page, named by the nav. To show names instead of ids in a scope, add an
 * argument carrying them and build that scope's crumbs from it, with `options` for sibling menus (docs/routing-and-layouts.md §6.4).
 */
export function breadcrumbTrail(pathname: string, scopes: NavScope[]): Crumb[] {
  if (!resolveScope(scopes, pathname)) return []
  const links = navLinks(sectionsFor(scopes, pathname))
  const page = links.find((link) => link.href === pathname)?.title
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: Crumb[] = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`
    return {
      label: segment,
      href: links.some((link) => link.href === href) ? href : undefined,
    }
  })
  if (page && page.toLowerCase() !== segments.at(-1)) {
    crumbs.push({ label: page.toLowerCase() })
  }
  return crumbs
}
