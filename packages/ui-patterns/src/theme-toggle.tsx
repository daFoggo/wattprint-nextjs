"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"

import {
  ThemeToggle as HairlineThemeToggle,
  type Theme,
} from "@workspace/ui/components/hairline/theme-toggle"
import { cn } from "@workspace/ui/lib/utils"

const subscribe = () => () => {}

/**
 * Theme control. `icon` (default) flips light/dark; `segmented` is the Light / System / Dark choice of the account menu.
 * Needs `ThemeProvider` above it.
 */
export function ThemeToggle({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "segmented"
  className?: string
}) {
  const { theme, setTheme } = useTheme()
  // next-themes only knows the theme on the client; a placeholder keeps the server HTML and the first paint in step.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  if (!mounted) return <span aria-hidden className={cn("inline-flex size-9", className)} />
  return (
    <HairlineThemeToggle
      variant={variant}
      value={(theme ?? "dark") as Theme}
      onValueChange={setTheme}
      className={className}
    />
  )
}
