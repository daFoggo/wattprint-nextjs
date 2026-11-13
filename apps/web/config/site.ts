import { getPathname } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { publicEnv } from "@/lib/env.public"

/** Absolute link into the dashboard app (apps/dashboard), which owns sign-in and every signed-in page, in the same language. */
export function dashboardHref(path: string, locale: Locale): string {
  return new URL(
    getPathname({ href: path, locale }),
    publicEnv.NEXT_PUBLIC_DASHBOARD_URL
  ).toString()
}
