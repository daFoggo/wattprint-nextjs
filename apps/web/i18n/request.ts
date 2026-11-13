import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"
import { notFound } from "next/navigation"
import * as rootParams from "next/root-params"

import { routing } from "./routing"

export default getRequestConfig(async ({ locale, requestLocale }) => {
  if (!locale) {
    // Root params keep pages static; Server Actions and Route Handlers have none, so they use the proxy's header.
    // locale() throws synchronously there (not a rejected promise), hence try/catch rather than .catch().
    let requested: string | undefined
    try {
      requested = await rootParams.locale()
    } catch {
      requested = await requestLocale
    }
    if (requested !== undefined && !hasLocale(routing.locales, requested))
      notFound()
    locale = requested ?? routing.defaultLocale
  }
  return {
    locale,
    // Homes are in Vietnam: one zone keeps server and browser dates identical (no hydration mismatch).
    timeZone: "Asia/Ho_Chi_Minh",
    messages: (await import(`../messages/${locale}.ts`)).default,
  }
})
