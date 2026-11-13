import { getLocale } from "next-intl/server"

import { DASHBOARD_PATH } from "@/config/routes"
import { redirect } from "@/i18n/navigation"

// Always redirects / 404s, so there is no static shell to validate (docs: route-segment-config/instant).
export const instant = false

/** The dashboard has no public home: the landing page is apps/web. `proxy.ts` sends a signed-out visitor on to sign-in. */
export default async function HomePage() {
  redirect({ href: DASHBOARD_PATH, locale: await getLocale() })
}
