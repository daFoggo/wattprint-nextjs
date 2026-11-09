"use client"

import { Toaster as DingToaster, toast } from "@yusufceng1z/ding-react"
import { useTheme } from "next-themes"

/** Ding shows one toast at a time and injects its own styles, so it follows light/dark via the `theme` prop only. */
function Toaster({ children }: { children?: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  return (
    <>
      {children}
      <DingToaster
        position="bottom-right"
        theme={resolvedTheme === "light" ? "light" : "dark"}
      />
    </>
  )
}

export { Toaster, toast }
