import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getTranslations } from "next-intl/server"
import { locale } from "next/root-params"

import "../landing.css"
import { ThemeProvider } from "@workspace/ui-patterns/theme-provider"
import { cn } from "@workspace/ui/lib/utils"
import { HairlineTextProvider } from "@workspace/ui/components/hairline-text"
import { hairlineMessages } from "@workspace/ui/lib/hairline-messages"
import { fontStyle, landingFontClassName } from "@workspace/ui/lib/fonts"
import { routing, type Locale } from "@/i18n/routing"
import { publicEnv } from "@/lib/env.public"
import { openGraphBase } from "@/lib/seo"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.meta")
  const lang = (await locale()) as Locale
  return {
    // Makes relative canonicals (`/some/path`) absolute.
    metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
    title: { default: "WattPrint", template: "%s | WattPrint" },
    description: t("description"),
    openGraph: openGraphBase(
      lang,
      (await getTranslations("landing.meta"))("ogAlt")
    ),
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
      className={cn("antialiased", "font-sans", landingFontClassName)}
    >
      <body className="bg-lp-ground text-lp-ink">
        <NextIntlClientProvider>
          <HairlineTextProvider messages={hairlineMessages[lang] ?? {}}>
            <ThemeProvider>{children}</ThemeProvider>
          </HairlineTextProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
