import { IconArrowRight } from "@tabler/icons-react"
import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * The landing's actions, drawn like the dashboard's PillLink (apps/dashboard/components/shared/nav-links.tsx) at the
 * landing's scale: a soft pill with the label, its arrow in a round primary dot that turns up and out on hover. Same
 * family, so the page and the app read as one product. `tone` picks the pill for the ground it sits on.
 */
const TONE = {
  // Mint stands off both the page ground and the header surface (both are near-white or near-black).
  ground: "bg-lp-mint text-lp-ink hover:bg-lp-lime",
  stage:
    "bg-lp-stage-line text-lp-stage-ink hover:bg-lp-accent hover:text-lp-accent-ink",
  lime: "bg-lp-ground text-lp-ink hover:bg-lp-surface",
} as const

const SIZE = {
  // md matches the header controls: Hairline ThemeToggle is 36px, SegmentedControl md 34px.
  md: { pill: "h-9 gap-2 pl-4 pr-1 text-sm", dot: "size-7", arrow: "size-4" },
  lg: {
    pill: "h-12 gap-3 pl-5 pr-1.5 text-base",
    dot: "size-9",
    arrow: "size-4.5",
  },
} as const

export function EnergyButton({
  href,
  children,
  tone = "ground",
  size = "lg",
}: {
  href: string
  children: ReactNode
  tone?: keyof typeof TONE
  size?: keyof typeof SIZE
}) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex items-center rounded-full font-medium whitespace-nowrap transition-colors duration-200",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        SIZE[size].pill,
        TONE[tone]
      )}
    >
      {children}
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-primary text-primary-foreground",
          SIZE[size].dot
        )}
      >
        <IconArrowRight
          aria-hidden
          className={cn(
            SIZE[size].arrow,
            "motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-rotate-45"
          )}
        />
      </span>
    </a>
  )
}
