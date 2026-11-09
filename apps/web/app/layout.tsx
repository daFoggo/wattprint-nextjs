import type { Metadata } from "next"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@workspace/ui-patterns/theme-provider"
import { cn } from "@workspace/ui/lib/utils"
import { fontClassName, fontStyle } from "@workspace/ui/lib/fonts"
import { publicEnv } from "@/lib/env.public"

export const metadata: Metadata = {
  // Makes relative canonicals (`/some/path`) absolute.
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Next Mono Base",
    template: "%s | Next Mono Base",
  },
  description:
    "A Next.js monorepo base: auth, data, UI kit and conventions ready to build on.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={fontStyle}
      className={cn("antialiased", "font-sans", fontClassName)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
