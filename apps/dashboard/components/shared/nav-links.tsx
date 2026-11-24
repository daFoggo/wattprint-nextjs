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
//   CardLink    the quiet "more of this" in a card's header: an outlined pill, its arrow in a muted dot
//   PillLink    the one step a card exists to lead to, an arrow in a filled dot (Hairline's site buttons)
//   DeviceChip  to a device, by its icon and name, so you see where you land

export const FOCUS =
  "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
/** CardLink's dot and its arrow, shared with IconLink (components/shared/icon-link.tsx) so the two change together. */
export const LINK_DOT = "flex size-6 items-center justify-center rounded-full"
export const LINK_ARROW =
  "size-3.5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-rotate-45"

type Href = React.ComponentProps<typeof Link>["href"]

/**
 * A quiet outlined pill, its arrow in a muted dot that turns up and out on hover: PillLink's family one step down
 * (the primary dot stays for the one step a card exists to lead to).
 */
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
        "group inline-flex h-7 items-center gap-2 rounded-full pr-0.5 pl-3 text-xs font-medium whitespace-nowrap text-foreground ring-1 ring-border transition-colors duration-200 ring-inset hover:bg-accent",
        FOCUS,
        className
      )}
    >
      {children}
      <span className={cn(LINK_DOT, "bg-muted")}>
        <IconArrowRight aria-hidden className={LINK_ARROW} />
      </span>
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

/** A record's name in a chip (a device's with its icon); `dir` adds the chevron of a previous / next step. */
export function DeviceChip({
  href,
  type,
  name,
  dir = "next",
  className,
}: {
  href: Href
  /** A device's type, for its icon; leave it out for a record with none (a past plan). */
  type?: string
  name: string
  dir?: "previous" | "next"
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full bg-background text-xs font-medium ring-1 ring-border transition-colors duration-200 ring-inset hover:bg-accent",
        dir === "previous"
          ? "pr-2.5 pl-2"
          : type
            ? "pr-1.5 pl-1"
            : "pr-1.5 pl-2.5",
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
      {type ? <DeviceIcon type={type} size="xs" /> : null}
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
