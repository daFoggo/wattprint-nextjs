import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { DASHBOARD_PATH, SIGN_IN_PATH } from "@/config/routes"
import { handlerLocale } from "@/i18n/cookie-locale"
import { getPathname } from "@/i18n/navigation"
import { getAuthProvider } from "@/lib/auth"
import { publicEnv } from "@/lib/env.public"

/** OAuth redirect target (PKCE): exchanges `?code=` for the session cookies. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  // `request.nextUrl.origin` can be the internal host behind a reverse proxy; use the public URL.
  const origin = publicEnv.NEXT_PUBLIC_APP_URL
  const code = searchParams.get("code")
  const locale = await handlerLocale()

  if (code) {
    try {
      const provider = await getAuthProvider()
      await provider.oauth.exchangeCode(code, searchParams.get("state"))
      return NextResponse.redirect(
        new URL(getPathname({ href: DASHBOARD_PATH, locale }), origin)
      )
    } catch {
      // fall through to the error redirect
    }
  }
  return NextResponse.redirect(
    new URL(
      `${getPathname({ href: SIGN_IN_PATH, locale })}?error=oauth`,
      origin
    )
  )
}
