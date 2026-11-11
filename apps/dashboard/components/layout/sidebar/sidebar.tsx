"use client"

import { createContext, use, useEffect, useEffectEvent, useState } from "react"
import { IconLayoutSidebar } from "@tabler/icons-react"

import { Sheet } from "@workspace/ui/components/hairline/sheet"
import {
  EASE_OUT,
  INTERACTION_FOCUS,
  INTERACTION_PRESS,
} from "@workspace/ui/components/hairline/motion"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { cn } from "@workspace/ui/lib/utils"

/**
 * The dashboard sidebar, built on Hairline UI's motion (it ships no sidebar). From md it is a
 * column that shrinks to a 48px icon rail; below md it is a Hairline `Sheet` from the left.
 * The aside carries shadcn's `group` + `data-collapsible="icon"` contract, so children style the
 * rail with `group-data-[collapsible=icon]:*`.
 */
const SidebarContext = createContext<{
  /** Desktop and collapsed: only icons show. */
  iconRail: boolean
  isMobile: boolean
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggle: () => void
} | null>(null)

export function useSidebar() {
  const state = use(SidebarContext)
  if (!state) throw new Error("useSidebar must sit inside SidebarProvider")
  return state
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [expanded, setExpanded] = useState(true)
  const [openMobile, setOpenMobile] = useState(false)
  const toggle = () =>
    isMobile ? setOpenMobile((open) => !open) : setExpanded((open) => !open)

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      toggle()
    }
  })
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <SidebarContext
      value={{
        iconRail: !expanded && !isMobile,
        isMobile,
        openMobile,
        setOpenMobile,
        toggle,
      }}
    >
      <div className="flex min-h-svh w-full">{children}</div>
    </SidebarContext>
  )
}

export function Sidebar({
  header,
  mobileTitle,
  children,
}: {
  /** The header cell of the desktop column (logo + trigger). */
  header: React.ReactNode
  /** Heading of the mobile sheet (it brings its own close button). */
  mobileTitle: React.ReactNode
  children: React.ReactNode
}) {
  const { iconRail, isMobile, openMobile, setOpenMobile } = useSidebar()
  if (isMobile) {
    return (
      <Sheet
        side="left"
        width={288}
        title={mobileTitle}
        open={openMobile}
        onOpenChange={setOpenMobile}
      >
        {/* The sheet body is a block: this column lets pinned sections sit at its bottom. */}
        <div className="flex min-h-full flex-col">{children}</div>
      </Sheet>
    )
  }
  return (
    <aside
      data-state={iconRail ? "collapsed" : "expanded"}
      data-collapsible={iconRail ? "icon" : undefined}
      style={{ transitionTimingFunction: EASE_OUT }}
      // A section plate floating on the page (docs/design-system.md, Surfaces): the 8px frame keeps the 48px rail.
      className="group sticky top-0 hidden h-svh w-64 shrink-0 p-2 transition-[width] duration-300 motion-reduce:transition-none data-[collapsible=icon]:w-16 md:block"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-sidebar text-sidebar-foreground">
        {header}
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </aside>
  )
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggle, iconRail, isMobile, openMobile } = useSidebar()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle sidebar"
      aria-expanded={isMobile ? openMobile : !iconRail}
      className={cn(
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground",
        INTERACTION_PRESS,
        INTERACTION_FOCUS,
        className
      )}
    >
      <IconLayoutSidebar aria-hidden className="size-4" />
    </button>
  )
}
