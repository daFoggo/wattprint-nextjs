import { defineRouting } from "next-intl/routing"

/**
 * Vietnamese is the default and has no prefix (`/dashboard`); English lives under `/en`.
 * The URL alone picks the language (no Accept-Language guess): the product is Vietnamese first.
 * Keep in sync with the other app (apps/web, apps/dashboard): they share one domain (multi-zone).
 */
export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  localePrefix: "as-needed",
  localeDetection: false,
})

export type Locale = (typeof routing.locales)[number]
