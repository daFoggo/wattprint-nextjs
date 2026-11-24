"use client"

import { IconArrowRight } from "@tabler/icons-react"

import { Tooltip } from "@workspace/ui/components/hairline/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { FOCUS, LINK_ARROW } from "@/components/shared/nav-links"
import { Link } from "@/i18n/navigation"

// A client component: the tooltip reads its trigger's props, which an element made on the server does not carry.

type Href = React.ComponentProps<typeof Link>["href"]

/** CardLink as its dot alone, for a header that already holds a control; the label is its name and tooltip. */
export function IconLink({ href, label }: { href: Href; label: string }) {
  return (
    <Tooltip content={label}>
      <Link
        href={href}
        aria-label={label}
        className={cn(
          "group flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-border transition-colors duration-200 ring-inset hover:bg-accent",
          FOCUS
        )}
      >
        <IconArrowRight aria-hidden className={LINK_ARROW} />
      </Link>
    </Tooltip>
  )
}
