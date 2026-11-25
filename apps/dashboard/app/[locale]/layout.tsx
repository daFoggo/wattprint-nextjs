import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"
import { locale } from "next/root-params"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@workspace/ui-patterns/theme-provider"
import { WebVitals } from "@/components/shared/web-vitals"
import { Toaster } from "@workspace/ui/components/hairline/toast-stack"
import { cn } from "@workspace/ui/lib/utils"
import { HairlineTextProvider } from "@workspace/ui/components/hairline-text"
import { hairlineMessages } from "@workspace/ui/lib/hairline-messages"
import { fontClassName, fontStyle } from "@workspace/ui/lib/fonts"
import { routing } from "@/i18n/routing"
import { publicEnv } from "@/lib/env.public"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata(): Promise<Metadata> {
  const [t, lang] = await Promise.all([
    getTranslations("common.meta"),
    getLocale(),
  ])
  return {
    // Makes relative canonicals (`/some/path`) absolute.
    metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
    title: { default: "WattPrint", template: "%s | WattPrint" },
    description: t("description"),
    // The landing page serves /og.png at the same domain: a link to a dashboard page (sign-in, dashboard) previews too.
    openGraph: {
      siteName: "WattPrint",
      type: "website",
      locale: lang === "en" ? "en_US" : "vi_VN",
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: ["/og.png"] },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const lang = await locale()
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      style={fontStyle}
      className={cn("antialiased", "font-sans", fontClassName)}
    >
      <body>
        <NextIntlClientProvider>
          <HairlineTextProvider messages={hairlineMessages[lang] ?? {}}>
            <ThemeProvider>
              {children}
              <Toaster />
              <WebVitals />
            </ThemeProvider>
          </HairlineTextProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
