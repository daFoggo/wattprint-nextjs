import type { Metadata } from "next"
import { Suspense } from "react"

import { FormError } from "@/features/auth/components/form-error"
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button"

import { signInWithKeycloakAction } from "@/features/auth/actions"

import {
  AuthAside,
  AuthBody,
  AuthHeader,
  AuthHeading,
  AuthMain,
  AuthPitch,
} from "../_components/auth-frame"

export const metadata: Metadata = { title: "Sign in" }

async function OAuthError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  if (!error) return null
  return (
    <FormError message="Sign-in with Google failed. Please try again." />
  )
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <>
      <AuthAside>
        <AuthPitch title="Pick up where you left off.">
          Your energy dashboard, one click away.
        </AuthPitch>
      </AuthAside>
      <AuthMain>
        <AuthHeader />
        <AuthBody>
          <AuthHeading title="Welcome back">
            Sign in to your account.
          </AuthHeading>
          <div className="flex flex-col gap-4">
            <Suspense>
              <OAuthError searchParams={searchParams} />
            </Suspense>
            <GoogleSignInButton action={signInWithKeycloakAction} />
          </div>
        </AuthBody>
      </AuthMain>
    </>
  )
}
