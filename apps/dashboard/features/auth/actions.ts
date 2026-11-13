"use server"

import { updateTag } from "next/cache"
import { cookies } from "next/headers"
import { getLocale } from "next-intl/server"
import { redirect } from "next/navigation"

import { OAUTH_CALLBACK_PATH, SIGN_IN_PATH } from "@/config/routes"
import { getPathname } from "@/i18n/navigation"
import { getAuthProvider } from "@/lib/auth"
import { SESSION_TAG } from "@/lib/dal"
import { publicEnv } from "@/lib/env.public"

/**
 * Sends the browser to Keycloak in the page's language. With `provider` Keycloak goes straight to that identity
 * provider; without it, it shows its login page (the WattPrint theme: email + password, Google beside it).
 * An expected provider error lands back on sign-in.
 */
async function startSignIn(provider?: string): Promise<never> {
  const auth = await getAuthProvider()
  const locale = await getLocale()
  // The OAuth callback has no `[locale]`: it reads this to land back in the same language.
  const cookieStore = await cookies()
  cookieStore.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax" })
  let url: string | undefined
  try {
    url = await auth.oauth.start(
      `${publicEnv.NEXT_PUBLIC_APP_URL}${OAUTH_CALLBACK_PATH}`,
      { provider, locale }
    )
  } catch (error) {
    if (!auth.isExpectedError(error)) throw error
  }
  redirect(url ?? `${getPathname({ href: SIGN_IN_PATH, locale })}?error=oauth`)
}

export async function signInWithGoogleAction(): Promise<void> {
  await startSignIn("google")
}

export async function signInWithEmailAction(): Promise<void> {
  await startSignIn()
}

export async function signOutAction(): Promise<void> {
  const provider = await getAuthProvider()
  const signIn = getPathname({ href: SIGN_IN_PATH, locale: await getLocale() })
  // Keycloak ends its SSO session when the browser visits the end-session URL, then returns to the sign-in page.
  const endSessionUrl = await provider.signOut(
    `${publicEnv.NEXT_PUBLIC_APP_URL}${signIn}`
  )
  updateTag(SESSION_TAG)
  redirect(endSessionUrl ?? signIn)
}
