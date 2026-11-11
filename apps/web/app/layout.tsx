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
    default: "WattPrint",
    template: "%s | WattPrint",
  },
  description:
    "Your energy dashboard: track your home's electricity use in one place.",
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
