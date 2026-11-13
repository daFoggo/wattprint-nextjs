import { useLocale } from "next-intl"

import { routing } from "@/i18n/routing"
import { publicEnv } from "@/lib/env.public"

/** Landing page (apps/web, another origin) in the current language: `/en` prefix, none for the default. */
export function useLandingHref() {
  const locale = useLocale()
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`
  return (path = "") => `${publicEnv.NEXT_PUBLIC_LANDING_URL}${prefix}${path}`
}
