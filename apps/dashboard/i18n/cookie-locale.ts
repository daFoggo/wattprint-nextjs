import { hasLocale } from "next-intl"
import { cookies } from "next/headers"

import { routing } from "./routing"

/**
 * For Route Handlers, which have no `[locale]`: a `?locale=` the redirect to them carried, else the NEXT_LOCALE cookie
 * (set by the sign-in actions, and by next-intl's proxy only when the page language differs from Accept-Language).
 */
export async function handlerLocale(searchParams?: URLSearchParams) {
  const fromUrl = searchParams?.get("locale")
  if (hasLocale(routing.locales, fromUrl)) return fromUrl
  const fromCookie = (await cookies()).get("NEXT_LOCALE")?.value
  return hasLocale(routing.locales, fromCookie)
    ? fromCookie
    : routing.defaultLocale
}
