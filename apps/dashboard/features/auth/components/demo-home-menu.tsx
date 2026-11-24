"use client"

import { IconEye } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Popover } from "@workspace/ui/components/hairline/popover"

import { useSidebar } from "@/components/layout/sidebar/sidebar"

import type { DemoHome } from "../schemas"
import { DemoHomePicker } from "./demo-home-picker"

/**
 * A demo viewer's row in the sidebar, above the account row: which demo home this is, read-only (just the eye in
 * the icon rail). Its panel says what read-only means and switches to another demo home.
 */
export function DemoHomeMenu({
  name,
  homes,
  action,
}: {
  name: string
  homes: DemoHome[]
  action: (key: string) => Promise<{ error: string } | void>
}) {
  const { iconRail } = useSidebar()
  const t = useTranslations("auth.demo")
  const others = homes.filter((home) => home.name !== name)
  return (
    <Popover
      label={t("menuLabel", { name })}
      width={320}
      side={iconRail ? "right" : "top"}
      align={iconRail ? "end" : "start"}
      trigger={
        // A bordered notice, not a menu row: it must not read as a second account.
        <button
          type="button"
          data-sidebar="menu-button"
          aria-label={t("menuLabel", { name })}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-background px-3 py-2 text-left transition-colors duration-150 hover:bg-accent aria-expanded:bg-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-1.5"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <IconEye aria-hidden className="size-3.5 shrink-0" />
              {t("readOnly")}
            </span>
            <span className="text-sm">{name}</span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {t("switch")}
          </span>
          <IconEye
            aria-hidden
            className="hidden size-4 text-muted-foreground group-data-[collapsible=icon]:block"
          />
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{name}</span>
          <p className="text-sm text-muted-foreground">{t("viewing")}</p>
        </div>
        {others.length ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">
              {t("switchTitle")}
            </span>
            <DemoHomePicker homes={others} action={action} />
          </div>
        ) : null}
      </div>
    </Popover>
  )
}
