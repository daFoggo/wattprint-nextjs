import { Skeleton } from "@workspace/ui/components/hairline/skeleton"
import { cn } from "@workspace/ui/lib/utils"

/**
 * A tile's Suspense fallback in the tile's own shell (see `Tile`): its title and description lines, then a block
 * of the body's height, so the tile does not jump when it streams in. Fixed sizes only (no random widths while
 * prerendering).
 */
export function TileSkeleton({
  height,
  className,
}: {
  /** The body's height in px, below the header. */
  height: number
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-3xl border bg-background p-4 md:p-5",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <Skeleton width="40%" />
        <Skeleton width="65%" height={10} />
      </div>
      <Skeleton shape="block" height={height} />
    </div>
  )
}
