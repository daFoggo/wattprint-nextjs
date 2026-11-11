"use client"

import type { ReactNode } from "react"

import { Dialog } from "@workspace/ui/components/hairline/dialog"
import { Sheet } from "@workspace/ui/components/hairline/sheet"

import { useMediaQuery } from "@/hooks/use-media-query"

/**
 * Dialog from `md` up, bottom Sheet below it (Hairline UI). Both are a native `<dialog>`: focus stays
 * inside, the page is inert, and the body scrolls inside the panel when it is taller than the screen.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  /** `md` 520px, `lg` 680px wide. */
  size?: "md" | "lg"
  children: ReactNode
}) {
  const desktop = useMediaQuery("(min-width: 768px)")
  const panel = { open, onOpenChange, title, description, children }
  return desktop ? <Dialog {...panel} size={size} /> : <Sheet {...panel} side="bottom" />
}

/** Buttons row for a form inside `ResponsiveDialog`: stacked on mobile, right-aligned from `sm`. */
export function DialogActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {children}
    </div>
  )
}
