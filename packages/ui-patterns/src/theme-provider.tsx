"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/** Dark by default (docs/design-system.md); light and the system setting stay available. */
function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
