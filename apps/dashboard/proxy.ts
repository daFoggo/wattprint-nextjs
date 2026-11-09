import type { NextRequest } from "next/server"

import { redirectWithSession, updateSession } from "@workspace/auth/proxy"

import { AUTH_OPTIONS } from "@/config/auth"
import { publicEnv } from "@/lib/env.public"
import {
  DASHBOARD_PATH,
  AUTH_PAGES,
  PROTECTED_PREFIXES,
  SIGN_IN_PATH,
} from "@/config/routes"

/**
 * 1) Refresh the Keycloak session so Server Components see fresh tokens.
 * 2) Optimistic redirect for protected paths. Real authorization is in the DAL.
 * 3) Emits Server-Timing header for Chrome DevTools Network profiling.
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

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  if (isProtected && !isAuthenticated) {
    return redirectWithSession(new URL(SIGN_IN_PATH, publicEnv.NEXT_PUBLIC_APP_URL), response)
  }
  if (isAuthenticated && (AUTH_PAGES as readonly string[]).includes(pathname)) {
    return redirectWithSession(new URL(DASHBOARD_PATH, publicEnv.NEXT_PUBLIC_APP_URL), response)
  }
  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|__nextjs_font|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
  ],
}
