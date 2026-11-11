"use client"

import { useRouter } from "next/navigation"
import { IconSelector } from "@tabler/icons-react"

import { DropdownMenu } from "@workspace/ui/components/hairline/dropdown-menu"

import type { Crumb } from "@/config/navigation"

import { NavIcon } from "@/components/layout/sidebar/nav-icons"

/** A breadcrumb that is a menu (switch organization, switch project). The current entry is the label. */
export function CrumbMenu({ crumb }: { crumb: Crumb }) {
  const router = useRouter()
  return (
    <DropdownMenu
      label={crumb.label}
      // Rows are not <Link>s, so nothing prefetches them: warm the targets when the menu opens.
      onOpenChange={(open) =>
        open && crumb.options?.forEach((option) => router.prefetch(option.href))
      }
      trigger={
        <button
          type="button"
          className="flex items-center gap-1 rounded-md transition-colors duration-150 hover:text-foreground aria-expanded:text-foreground"
        >
          {crumb.icon ? <NavIcon name={crumb.icon} /> : null}
          {crumb.label}
          <IconSelector aria-hidden className="size-4" />
        </button>
      }
      // Hairline menu rows are buttons, not links: navigate on select.
      items={(crumb.options ?? []).map((option) => ({
        id: option.href,
        label: option.label,
        onSelect: () => router.push(option.href),
      }))}
    />
  )
}
