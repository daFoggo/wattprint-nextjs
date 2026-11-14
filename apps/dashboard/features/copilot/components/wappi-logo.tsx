import { cn } from "@workspace/ui/lib/utils"

// Wappi as pixel art: a small robot whose antenna light and eyes are the brand green, like the device dots of the
// WattPrint mark (it is the home's energy assistant). Ink follows the theme (`currentColor`). Two drawings, so every
// size shows whole device pixels: 12 cells for 24px and up, 8 cells for 16px (beside text, like a menu icon).
const LARGE = {
  grid: 12,
  ink: [
    "............",
    ".....##.....",
    ".##########.",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "#...####...#",
    ".##########.",
    "..#......#..",
  ],
  green: [
    ".....##.....",
    "............",
    "............",
    "............",
    "...##..##...",
    "...##..##...",
  ],
}
const SMALL = {
  grid: 8,
  ink: [
    "........",
    "...##...",
    ".######.",
    "#......#",
    "#......#",
    "#..##..#",
    ".######.",
    "..#..#..",
  ],
  green: ["...##...", "........", "........", "........", "..#..#.."],
}

/** One path of 1×1 squares for every `#` in the rows. */
const pixels = (rows: string[]) =>
  rows
    .flatMap((row, y) =>
      [...row].map((cell, x) => (cell === "#" ? `M${x} ${y}h1v1h-1z` : ""))
    )
    .join("")

const DRAWINGS = {
  small: {
    ...SMALL,
    inkPath: pixels(SMALL.ink),
    greenPath: pixels(SMALL.green),
  },
  large: {
    ...LARGE,
    inkPath: pixels(LARGE.ink),
    greenPath: pixels(LARGE.green),
  },
}

const SIZE = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
  xl: "size-12",
} as const

/**
 * Wappi's logo: pixel art, so it reads as a character and not as another icon in the menu. Use it where Wappi
 * introduces itself (sidebar entry, panel and page title, its buttons, opening screen), not on every message.
 */
export function WappiLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZE
  className?: string
}) {
  const d = DRAWINGS[size === "sm" ? "small" : "large"]
  // Centre the drawing's rows vertically on its square grid.
  const top = -(d.grid - d.ink.length) / 2
  return (
    <svg
      viewBox={`0 ${top} ${d.grid} ${d.grid}`}
      aria-hidden
      shapeRendering="crispEdges"
      className={cn("shrink-0", SIZE[size], className)}
    >
      <path className="fill-current" d={d.inkPath} />
      <path className="fill-chart-1" d={d.greenPath} />
    </svg>
  )
}
