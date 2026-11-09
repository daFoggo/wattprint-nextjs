"use server"

import { updateTag } from "next/cache"
import { redirect } from "next/navigation"

import {
  OAUTH_CALLBACK_PATH,
  SIGN_IN_PATH,
} from "@/config/routes"
import { getAuthProvider } from "@/lib/auth"
import { SESSION_TAG } from "@/lib/dal"
import { publicEnv } from "@/lib/env.public"

/**
 * Sends the browser to Keycloak, which skips its own login form (`kc_idp_hint=google`) and goes straight to
 * Google. An expected provider error lands back on sign-in.
 */
export async function signInWithKeycloakAction(): Promise<void> {
  const provider = await getAuthProvider()
  let url: string | undefined
  try {
    url = await provider.oauth.start(
      `${publicEnv.NEXT_PUBLIC_APP_URL}${OAUTH_CALLBACK_PATH}`
    )
  } catch (error) {
    if (!provider.isExpectedError(error)) throw error
  }
  redirect(url ?? `${SIGN_IN_PATH}?error=oauth`)
}

export async function signOutAction(): Promise<void> {
  const provider = await getAuthProvider()
  await provider.signOut()
  updateTag(SESSION_TAG)
  redirect(SIGN_IN_PATH)
}
