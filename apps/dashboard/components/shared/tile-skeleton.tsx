import { Skeleton } from "@workspace/ui/components/hairline/skeleton"
import { cn } from "@workspace/ui/lib/utils"

/**
 * A tile's Suspense fallback in the tile's own shell (see `Tile`): its title and description lines, then a block
 * of the body's height, so the tile does not jump when it streams in. Fixed sizes only (no random widths while
 * prerendering).
 */
export function TileSkeleton({
  height,
  mobile,
  className,
}: {
  /** The body's height in px, below the header, from lg (measured: the loaded tile, or its row, minus 90). */
  height: number
  /** Below lg, where a tile has a column of its own and often another height; `height` when left out. */
  mobile?: number
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
      {mobile === undefined ? (
        <Skeleton shape="block" height={height} />
      ) : (
        <>
          {/* Wrapped: the skeleton sets its own display. */}
          <div className="lg:hidden">
            <Skeleton shape="block" height={mobile} />
          </div>
          <div className="hidden lg:block">
            <Skeleton shape="block" height={height} />
          </div>
        </>
      )}
    </div>
  )
}
