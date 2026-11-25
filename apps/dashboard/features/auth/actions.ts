"use server"

import { refresh, updateTag } from "next/cache"
import { cookies } from "next/headers"
import { getLocale, getTranslations } from "next-intl/server"
// eslint-disable-next-line no-restricted-imports -- redirects to Keycloak (external) or a getPathname({ locale }) path (docs/internationalization.md)
import { redirect } from "next/navigation"

import {
  DASHBOARD_PATH,
  OAUTH_CALLBACK_PATH,
  SIGN_IN_PATH,
} from "@/config/routes"
import { getPathname } from "@/i18n/navigation"
import { getAuthProvider } from "@/lib/auth"
import { requirePermission, SESSION_TAG } from "@/lib/dal"
import { ApiError, isExpectedDataError } from "@/lib/errors"
import { publicEnv } from "@/lib/env.public"

import { DemoKeySchema } from "./schemas"
import { createDemoGuest, deleteAccount, viewDemoHome } from "./server"

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

/**
 * One click on the sign-in page: the backend makes a guest account viewing that demo home (deleted after a day)
 * and hands us its tokens, checked and stored like the OAuth callback's. Then the dashboard opens on the home.
 */
export async function startDemoAction(
  key: string
): Promise<{ error: string } | void> {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("auth.demo"),
  ])
  const parsed = DemoKeySchema.safeParse(key)
  if (!parsed.success) return { error: t("failed") }
  try {
    const tokens = await createDemoGuest(parsed.data)
    await (await getAuthProvider()).signInWithTokens(tokens)
  } catch (error) {
    console.error("demo guest failed", error)
    const busy =
      error instanceof ApiError &&
      (error.status === 429 || error.status === 503)
    return { error: t(busy ? "busy" : "failed") }
  }
  updateTag(SESSION_TAG)
  redirect(getPathname({ href: DASHBOARD_PATH, locale }))
}

/** Views a demo home read-only from the signed-in account, then opens the dashboard on it. */
export async function viewDemoHomeAction(
  key: string
): Promise<{ error: string } | void> {
  const { accessToken } = await requirePermission("account:view")
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("auth.demo"),
  ])
  const parsed = DemoKeySchema.safeParse(key)
  if (!parsed.success) return { error: t("failed") }
  try {
    await viewDemoHome(accessToken, parsed.data)
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
    const code = (error.body as { code?: string } | undefined)?.code
    return {
      error: t(code === "demo_not_for_members" ? "notForMembers" : "failed"),
    }
  }
  refresh() // the layouts too: the sidebar's demo row shows the new home
  redirect(getPathname({ href: DASHBOARD_PATH, locale }))
}

/**
 * Deletes the signed-in account for good. The backend refuses while other people belong to the home
 * (`home_has_members`) and when Keycloak could not finish (503): both come back as words to show, and the session
 * stays. On success the local session is cleared (the Keycloak one went with the account) and sign-in opens.
 */
export async function deleteAccountAction(): Promise<{ error: string } | void> {
  const { accessToken } = await requirePermission("account:view")
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("auth"),
  ])
  try {
    await deleteAccount(accessToken)
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
    const code = (error.body as { code?: string } | undefined)?.code
    if (code === "home_has_members")
      return { error: t("deleteAccount.homeHasMembers") }
    if (code === "account_delete_unavailable")
      return { error: t("deleteAccount.unavailable") }
    throw error
  }
  const signIn = getPathname({ href: SIGN_IN_PATH, locale })
  await (await getAuthProvider()).signOut() // clears our cookies; the Keycloak session is gone with the account
  updateTag(SESSION_TAG)
  redirect(signIn)
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
