import type { NextRequest, NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"

import { redirectWithSession, updateSession } from "@workspace/auth/proxy"

import { AUTH_OPTIONS } from "@/config/auth"
import { publicEnv } from "@/lib/env.public"
import {
  DASHBOARD_PATH,
  AUTH_PAGES,
  PROTECTED_PREFIXES,
  SIGN_IN_PATH,
} from "@/config/routes"
import { routing } from "@/i18n/routing"

const handleI18nRouting = createIntlMiddleware(routing)
const LOCALE_PREFIX = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`)

/** The intl response (rewrite to `/[locale]/...`) carries the session's refreshed cookies and cache headers. */
function withSession(intl: NextResponse, session: NextResponse) {
  for (const cookie of session.cookies.getAll()) intl.cookies.set(cookie)
  for (const [name, value] of session.headers)
    if (["cache-control", "expires", "pragma", "server-timing"].includes(name))
      intl.headers.set(name, value)
  return intl
}

/**
 * 1) Refresh the Keycloak session so Server Components see fresh tokens.
 * 2) Optimistic redirect for protected paths. Real authorization is in the DAL.
 * 3) Emits Server-Timing header for Chrome DevTools Network profiling.
 * 4) next-intl: `/en/...` stays English, any other path is served from `/vi/...`; redirects keep the language.
 */
export async function proxy(request: NextRequest) {
  const start = performance.now()
  const { response, isAuthenticated } = await updateSession(
    request,
    AUTH_OPTIONS
  )
  const duration = Math.max(0, performance.now() - start).toFixed(2)
  response.headers.set(
    "Server-Timing",
    `proxy;dur=${duration};desc="Proxy Auth Check"`
  )

  // Route Handlers under /auth (OAuth callback, expiry) and /api are not localized; /api runs through here only so
  // its session is refreshed like a page's (each handler still authorizes with the DAL).
  const handler = request.nextUrl.pathname
  if (handler.startsWith("/auth/") || handler.startsWith("/api/")) return response

  // Decoded as next-intl and the router will see it, so `/%64ashboard` is checked as `/dashboard`.
  let path = request.nextUrl.pathname
  try {
    path = decodeURI(path)
  } catch {
    // Malformed escapes: keep the raw path; the router 404s it.
  }
  const prefix = path.match(LOCALE_PREFIX)?.[0] ?? ""
  const pathname = path.slice(prefix.length) || "/"
  const localized = (path: string) =>
    new URL(`${prefix}${path}`, publicEnv.NEXT_PUBLIC_APP_URL)
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  if (isProtected && !isAuthenticated) {
    return redirectWithSession(localized(SIGN_IN_PATH), response)
  }
  if (isAuthenticated && (AUTH_PAGES as readonly string[]).includes(pathname)) {
    return redirectWithSession(localized(DASHBOARD_PATH), response)
  }
  return withSession(handleI18nRouting(request), response)
}

export const config = {
  matcher: [
    // Assets (assetPrefix /dashboard-static, files with a dot) must not be rewritten to /[locale].
    "/((?!_next/static|_next/image|__nextjs_font|dashboard-static|.*\\..*).*)",
  ],
}
