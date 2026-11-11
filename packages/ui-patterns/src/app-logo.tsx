import { cn } from "@workspace/ui/lib/utils"

const MARK = { sm: "size-4", md: "size-6", lg: "size-8", xl: "size-64" } as const
// `/none`: line-height 1, so the wordmark box is exactly its font size and centers on the mark.
const TEXT = {
  sm: "text-sm/none",
  md: "text-lg/none",
  lg: "text-2xl/none",
  xl: "text-4xl/none",
} as const
const GAP = { sm: "gap-2", md: "gap-2.5", lg: "gap-3", xl: "gap-4" } as const

type Size = keyof typeof MARK

/**
 * A home drawn as a wiring diagram: the roof apex is the single meter, the two roof-and-wall lines and the centre line
 * are the feeds it splits into, and each ends in a device (brand green). That is what WattPrint does: one sensor at the
 * breaker, energy per device. The lines are `currentColor`, so they follow the theme.
 */
function LogoMark({ size }: { size: Size }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      className={cn("shrink-0", MARK[size])}
    >
      <path
        className="stroke-current"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 18.2v-6.7l8-7 8 7v6.7M12 9v9.2"
      />
      <g className="fill-chart-1">
        <circle cx="4" cy="20" r="1.6" />
        <circle cx="12" cy="20" r="1.6" />
        <circle cx="20" cy="20" r="1.6" />
      </g>
    </svg>
  )
}

/**
 * App logo (design system § Logo). `full` (mark + wordmark) by default; `mark` where space is
 * tight; `wordmark` where the mark already shows nearby. `size` scales mark and wordmark together.
 * Pure visual: wrap it in a Link where it should navigate.
 */
export function AppLogo({
  variant = "full",
  size = "md",
  className,
  textClassName,
}: {
  variant?: "full" | "mark" | "wordmark"
  size?: Size
  className?: string
  /** For the wordmark only, e.g. to hide it inside a collapsed sidebar. */
  textClassName?: string
}) {
  return (
    <span
      role={variant === "mark" ? "img" : undefined}
      aria-label={variant === "mark" ? "WattPrint" : undefined}
      // Block-level flex: an inline-flex box sits on the text baseline and leaves a gap below it.
      className={cn("flex w-fit items-center", GAP[size], className)}
    >
      {variant === "wordmark" ? null : <LogoMark size={size} />}
      {variant === "mark" ? null : (
        <span
          className={cn(
            "font-mono font-semibold tracking-tight",
            TEXT[size],
            textClassName
          )}
        >
          WattPrint
        </span>
      )}
    </span>
  )
}
