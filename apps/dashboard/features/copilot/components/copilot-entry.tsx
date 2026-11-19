"use client"

import { useTranslations } from "next-intl"

import {
  INTERACTION_FOCUS,
  INTERACTION_PRESS,
} from "@workspace/ui/components/hairline/motion"
import { Tooltip } from "@workspace/ui/components/hairline/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { useSidebar } from "@/components/layout/sidebar/sidebar"
import { COPILOT_PATH, onCopilotPage } from "@/config/routes"
import { Link, usePathname } from "@/i18n/navigation"

import { usePanel } from "./copilot-provider"
import { WappiAvatar } from "./wappi-avatar"

/**
 * Wappi's entry at the top of the sidebar, apart from the page menu: a menu row (16px logo where the icon goes) as a
 * card on the sidebar plate, so it is told apart from the pages at a glance. It names Wappi and its role, where the
 * header's pill says "Ask Wappi", so the two read differently. In the icon rail only the logo stays, named by a tooltip.
 */
export function CopilotNavLink() {
  const t = useTranslations("copilot")
  const { iconRail, setOpenMobile } = useSidebar()
  const { setPanelOpen } = usePanel()
  const current = onCopilotPage(usePathname())
  const name = `${t("name")} · ${t("role")}`
  const link = (
    <Link
      href={COPILOT_PATH}
      aria-current={current ? "page" : undefined}
      aria-label={iconRail ? name : undefined}
      // The page is the panel at full size, so the panel closes: it would come back on leaving the page.
      onClick={() => {
        setOpenMobile(false)
        setPanelOpen(false)
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border bg-background px-1.5 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-accent",
        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent",
        INTERACTION_FOCUS
      )}
    >
      <WappiAvatar size="sm" />
      <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap group-data-[collapsible=icon]:hidden">
        {t("name")}
        <span className="truncate font-normal text-muted-foreground">
          {t("role")}
        </span>
      </span>
    </Link>
  )
  return iconRail ? (
    <Tooltip content={name} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  )
}

/**
 * Opens Wappi beside the page (Cmd/Ctrl+J): a labelled pill at the end of the breadcrumb row, with Wappi's logo, so
 * it is found without hovering. Gone while the panel is open (it has its own close) and on Wappi's own page.
 */
export function CopilotToggle() {
  const t = useTranslations("copilot")
  const { panelOpen, setPanelOpen, toggleRef } = usePanel()
  if (onCopilotPage(usePathname()) || panelOpen) return null
  return (
    <Tooltip content={t("openPanel")} shortcut="⌘J · Ctrl J" side="bottom">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setPanelOpen(true)}
        className={cn(
          "inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-full border bg-background px-3 text-sm font-medium transition-colors duration-150 hover:bg-accent",
          INTERACTION_PRESS,
          INTERACTION_FOCUS
        )}
      >
        <WappiAvatar size="sm" />
        {t("ask")}
      </button>
    </Tooltip>
  )
}
