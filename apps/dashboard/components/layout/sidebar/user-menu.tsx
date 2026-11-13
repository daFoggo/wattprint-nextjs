"use client"

import { IconSelector } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Avatar } from "@workspace/ui/components/hairline/avatar"
import { Popover } from "@workspace/ui/components/hairline/popover"
import type { Role } from "@workspace/auth/permissions"
import { ThemeToggle } from "@workspace/ui-patterns/theme-toggle"

import { useSidebar } from "@/components/layout/sidebar/sidebar"
import { LocaleSwitch } from "@/components/shared/locale-switch"

/**
 * Account row pinned to the sidebar bottom: initials avatar, name and role (just the avatar in the
 * icon rail, where the panel opens to the side). The panel holds who you are, the Light / System /
 * Dark choice and the caller's actions (composition), e.g. sign out from features/auth.
 */
export function UserMenu({
  name,
  email,
  role,
  children,
}: {
  name: string
  email: string | null
  role: Role
  children: React.ReactNode
}) {
  const { iconRail } = useSidebar()
  const tCommon = useTranslations("common")
  const t = useTranslations("layout")
  const roleLabel = t(`roles.${role}`)
  return (
    <Popover
      label={t("account")}
      width={288}
      side={iconRail ? "right" : "top"}
      align={iconRail ? "end" : "start"}
      trigger={
        <button
          type="button"
          data-sidebar="menu-button"
          aria-label={t("accountLabel", { name, role: roleLabel })}
          className="flex w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl p-1.5 text-left transition-colors duration-150 hover:bg-accent aria-expanded:bg-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0.5"
        >
          <Avatar name={name} size="sm" />
          <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {roleLabel}
            </span>
          </span>
          <IconSelector
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
          />
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={name} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{name}</span>
            {email ? (
              <span className="truncate text-xs text-muted-foreground">
                {email}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{t("theme")}</span>
          <ThemeToggle variant="segmented" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {tCommon("language")}
          </span>
          <LocaleSwitch />
        </div>
        {children}
      </div>
    </Popover>
  )
}
