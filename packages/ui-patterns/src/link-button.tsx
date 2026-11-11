import { cn } from "@workspace/ui/lib/utils"

/**
 * Classes for a link that looks like Hairline's `Button size="lg"` (which only renders a `<button>`).
 * Keep in step with `packages/ui/src/components/hairline/button.tsx` after `pnpm hairline` updates.
 */
export function linkButton({
  variant = "primary",
  className,
}: { variant?: "primary" | "outline"; className?: string } = {}) {
  return cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium whitespace-nowrap select-none",
    "transition-[background-color,color,box-shadow,scale] duration-200 active:scale-97 motion-reduce:transition-none motion-reduce:active:scale-100",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "text-foreground ring-1 ring-border ring-inset hover:bg-accent",
    className
  )
}
