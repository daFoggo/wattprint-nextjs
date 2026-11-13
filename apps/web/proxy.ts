import createIntlMiddleware from "next-intl/middleware"

import { routing } from "@/i18n/routing"

/** `/en/...` stays English, any other path is served from `/vi/...` (next-intl). */
export default createIntlMiddleware(routing)

export const config = {
  // Not the dashboard's paths (rewritten to apps/dashboard in next.config.ts, which localizes them itself), nor files.
  matcher: [
    "/((?!api|_next|_vercel|dashboard-static|(?:en/)?(?:sign-in|dashboard|auth)(?:/|\\.segments|$)|.*\\..*).*)",
  ],
}
