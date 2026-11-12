import { cn } from "@workspace/ui/lib/utils"

/**
 * Classes for a link that looks like Hairline's `Button size="lg"` or `size="md"` (which only renders a `<button>`).
 * Keep in step with `packages/ui/src/components/hairline/button.tsx` after `pnpm hairline` updates.
 */
export function linkButton({
  variant = "primary",
  size = "lg",
  className,
}: {
  variant?: "primary" | "outline"
  size?: "md" | "lg"
  className?: string
} = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-full text-sm font-medium whitespace-nowrap select-none",
    size === "lg" ? "h-10 gap-2 px-5" : "h-9 gap-1.5 px-4",
    "transition-[background-color,color,box-shadow,scale] duration-200 active:scale-97 motion-reduce:transition-none motion-reduce:active:scale-100",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "text-foreground ring-1 ring-border ring-inset hover:bg-accent",
    className
  )
}
