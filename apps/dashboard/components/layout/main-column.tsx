"use client"

import { createContext, use, useLayoutEffect, useState } from "react"

import { cn } from "@workspace/ui/lib/utils"

const Bare = createContext<(bare: boolean) => void>(() => {})

/**
 * The main column. A "bare" page (Wappi's) fills the viewport (the chat scrolls inside, the composer stays at the
 * bottom), shows no breadcrumb and sits in the sidebar's 8px frame.
 */
export function MainColumn({ children }: { children: React.ReactNode }) {
  const [bare, setBare] = useState(false)
  return (
    <Bare value={setBare}>
      <main
        data-bare={bare || undefined}
        className={cn(
          "group/main flex min-w-0 flex-1 flex-col gap-3",
          // Bare: the page's plate sits in the same 8px frame as the sidebar's, so the two read as one shell.
          bare ? "h-svh p-2 md:pl-0" : "px-4 pt-4 pb-14 sm:px-8 md:pt-8"
        )}
      >
        {children}
      </main>
    </Bare>
  )
}

/**
 * Rendered by a page that wants the bare column. An effect, not a DOM marker read with `:has()` or the URL: Cache
 * Components keeps visited pages mounted but hidden (a marker would outlive the visit) and cleans up their effects,
 * and reading the pathname here would make every dynamic route fail to prerender.
 */
export function BareMain() {
  const setBare = use(Bare)
  useLayoutEffect(() => {
    setBare(true)
    return () => setBare(false)
  }, [setBare])
  return null
}
