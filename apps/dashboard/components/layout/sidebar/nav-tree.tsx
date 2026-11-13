"use client"

import { useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { IconChevronDown } from "@tabler/icons-react"

import { Tooltip } from "@workspace/ui/components/hairline/tooltip"
import {
  EASE_OUT,
  INTERACTION_FOCUS,
  useInteractionReducedMotion,
} from "@workspace/ui/components/hairline/motion"
import { cn } from "@workspace/ui/lib/utils"

import type { NavEntry, NavGroup, NavLink } from "@/config/navigation"

import { useSidebar } from "@/components/layout/sidebar/sidebar"
import { NavIcon } from "@/components/layout/sidebar/nav-icons"

// `group-data-[collapsible=icon]` is the sidebar's 48px icon rail: rows keep only their icon.
// `relative` lifts the row above the gliding highlight; the transparent border reserves the current row's outline.
const row = cn(
  "group/row relative flex w-full items-center gap-2 overflow-hidden rounded-xl border border-transparent px-1.5 py-1.5 text-sm text-muted-foreground group-data-[collapsible=icon]:justify-center hover:text-foreground",
  INTERACTION_FOCUS
)

/** Translates a nav title, section label or breadcrumb segment (`layout.nav` keys); anything else, e.g. an id, shows as is. */
export function useNavLabel() {
  const t = useTranslations("layout.nav")
  type Key = Parameters<typeof t>[0]
  return (label: string) => (t.has(label as Key) ? t(label as Key) : label)
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-sidebar="menu-label"
      className="whitespace-nowrap group-data-[collapsible=icon]:hidden"
    >
      {children}
    </span>
  )
}

/**
 * The sidebar menu of design system §8: icon and label per link; the current page is a card inside
 * the sidebar plate (`bg-background` + border);
 * groups indent, two levels max. One hover surface glides from row to row, as in Hairline menus.
 * Only the icon stays when the sidebar collapses to its icon rail.
 */
export function NavTree({
  entries,
  current,
}: {
  entries: NavEntry[]
  /** The href to mark as the current page (`currentHref`), which also covers the pages under a link. */
  current?: string
}) {
  const reduced = useInteractionReducedMotion()
  // `moved` is false for the first row hovered, so the surface fades in instead of sliding from the top.
  const [hover, setHover] = useState({
    top: 0,
    height: 0,
    shown: false,
    moved: false,
  })
  return (
    <ul
      className="relative flex flex-col gap-1"
      onPointerOver={(event) => {
        // A tap would leave the surface stuck on the row; hover is for mice.
        if (event.pointerType !== "mouse") return
        const target = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-sidebar=menu-button]"
        )
        if (!target) return
        const list = event.currentTarget.getBoundingClientRect()
        const box = target.getBoundingClientRect()
        setHover((prev) => ({
          top: box.top - list.top,
          height: box.height,
          shown: true,
          moved: prev.shown,
        }))
      }}
      onPointerLeave={() => setHover((prev) => ({ ...prev, shown: false }))}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 rounded-xl bg-accent"
        style={{
          top: hover.top,
          height: hover.height,
          opacity: hover.shown ? 1 : 0,
          transition:
            hover.moved && !reduced
              ? `top 220ms ${EASE_OUT}, height 220ms ${EASE_OUT}, opacity 150ms`
              : "opacity 150ms",
        }}
      />
      {entries.map((entry) => (
        <li key={entry.title}>
          {"items" in entry ? (
            <TreeGroup group={entry} current={current} />
          ) : (
            <TreeLink link={entry} current={current === entry.href} />
          )}
        </li>
      ))}
    </ul>
  )
}

function TreeLink({ link, current }: { link: NavLink; current: boolean }) {
  const { setOpenMobile, iconRail } = useSidebar()
  const title = useNavLabel()(link.title)
  const anchor = (
    <Link
      href={link.href}
      prefetch={link.prefetch}
      data-sidebar="menu-button"
      aria-current={current ? "page" : undefined}
      data-current={current || undefined}
      // The rail hides the label; the tooltip only describes, so the link needs its name here.
      aria-label={iconRail ? title : undefined}
      // The mobile sidebar is a Sheet: close it once the user picks a page.
      onClick={() => setOpenMobile(false)}
      className={cn(
        row,
        // The current page is a card inside the sidebar plate (docs/design-system.md, Surfaces).
        "group/tree data-current:border-border data-current:bg-background data-current:font-medium data-current:text-foreground"
      )}
    >
      <span className="flex text-muted-foreground group-data-current/tree:text-foreground">
        <NavIcon name={link.icon} />
      </span>
      <RowLabel>{title}</RowLabel>
      {link.badge ? (
        <span
          data-sidebar="menu-badge"
          className="ml-auto text-xs text-muted-foreground tabular-nums group-data-[collapsible=icon]:hidden"
        >
          {link.badge}
        </span>
      ) : null}
    </Link>
  )
  // Names the icon only in the icon rail; elsewhere the label is visible.
  return iconRail ? (
    <Tooltip content={title} side="right">
      {anchor}
    </Tooltip>
  ) : (
    anchor
  )
}

function TreeGroup({ group, current }: { group: NavGroup; current?: string }) {
  const { iconRail } = useSidebar()
  const reduced = useInteractionReducedMotion()
  const [open, setOpen] = useState(true)
  const navLabel = useNavLabel()
  const panelId = useId()
  // The icon rail has no room for a group header: its links show flat instead.
  const expanded = iconRail || open
  const containsCurrent = group.items.some((item) => item.href === current)
  return (
    <div>
      <button
        type="button"
        data-sidebar="menu-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={cn(
          row,
          "group-data-[collapsible=icon]:hidden",
          containsCurrent && "text-foreground"
        )}
      >
        <RowLabel>{navLabel(group.title)}</RowLabel>
        <IconChevronDown
          aria-hidden
          className={cn(
            "ml-auto size-4 text-muted-foreground motion-safe:transition-transform motion-safe:duration-300",
            !open && "-rotate-90"
          )}
        />
      </button>
      <div
        id={panelId}
        inert={!expanded}
        className="grid"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: reduced
            ? undefined
            : `grid-template-rows 300ms ${EASE_OUT}`,
        }}
      >
        <ul className="flex min-h-0 flex-col gap-1 overflow-hidden pl-3 group-data-[collapsible=icon]:pl-0">
          {group.items.map((item) => (
            <li key={item.href}>
              <TreeLink link={item} current={item.href === current} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
