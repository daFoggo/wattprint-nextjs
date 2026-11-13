import {
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"

import { cn } from "@workspace/ui/lib/utils"

import { DeviceIcon } from "@/components/shared/device-icon"
import { Link } from "@/i18n/navigation"

// Links that lead from a card to a page, each no taller than the controls Hairline puts in its cards (28px), so
// a card's own content stays the loudest thing in it. Three looks for three jobs:
//   CardLink    the quiet "more of this" in a card's header (Hairline's own cards: "Open →")
//   PillLink    the one step a card exists to lead to, an arrow in a filled dot (Hairline's site buttons)
//   DeviceChip  to a device, by its icon and name, so you see where you land

const FOCUS =
  "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"

type Href = React.ComponentProps<typeof Link>["href"]

/** Muted text and an arrow that steps forward on hover. */
export function CardLink({
  href,
  children,
  className,
}: {
  href: Href
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1 rounded-sm text-xs whitespace-nowrap text-muted-foreground transition-colors duration-200 hover:text-foreground",
        FOCUS,
        className
      )}
    >
      {children}
      <IconArrowRight
        aria-hidden
        className="size-3.5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5"
      />
    </Link>
  )
}

/** A soft pill whose arrow sits in a primary dot that turns to point up and out on hover. */
export function PillLink({
  href,
  children,
  className,
}: {
  href: Href
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-7 items-center gap-2 rounded-full bg-muted pr-0.5 pl-3 text-xs font-medium whitespace-nowrap transition-colors duration-200 hover:bg-accent",
        FOCUS,
        className
      )}
    >
      {children}
      <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <IconArrowRight
          aria-hidden
          className="size-3.5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-rotate-45"
        />
      </span>
    </Link>
  )
}

/** A device's icon and name in a chip; `dir` adds the chevron of a previous / next step. */
export function DeviceChip({
  href,
  type,
  name,
  dir = "next",
  className,
}: {
  href: Href
  type: string
  name: string
  dir?: "previous" | "next"
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full bg-background text-xs font-medium ring-1 ring-border transition-colors duration-200 ring-inset hover:bg-accent",
        dir === "previous" ? "pr-2.5 pl-2" : "pr-1.5 pl-1",
        FOCUS,
        className
      )}
    >
      {dir === "previous" ? (
        <IconChevronLeft
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:group-hover:-translate-x-0.5"
        />
      ) : null}
      <DeviceIcon type={type} size="xs" />
      <span className="truncate">{name}</span>
      {dir === "next" ? (
        <IconChevronRight
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
        />
      ) : null}
    </Link>
  )
}
