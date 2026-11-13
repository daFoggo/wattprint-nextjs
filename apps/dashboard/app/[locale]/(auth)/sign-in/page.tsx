import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { FormError } from "@/features/auth/components/form-error"
import { EmailSignInButton } from "@/features/auth/components/email-sign-in-button"
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button"

import {
  signInWithEmailAction,
  signInWithGoogleAction,
} from "@/features/auth/actions"

import {
  AuthAside,
  AuthBody,
  AuthHeader,
  AuthHeading,
  AuthMain,
  AuthPitch,
} from "../_components/auth-frame"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn")
  return { title: t("metaTitle") }
}

async function OAuthError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  if (!error) return null
  const t = await getTranslations("auth.signIn")
  return <FormError message={t("failed")} />
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const t = useTranslations("auth.signIn")
  return (
    <>
      <AuthAside>
        <AuthPitch title={t("pitchTitle")}>
          {t("pitchBody")}
        </AuthPitch>
      </AuthAside>
      <AuthMain>
        <AuthHeader />
        <AuthBody>
          <AuthHeading title={t("title")}>
            {t("subtitle")}
          </AuthHeading>
          <div className="flex flex-col gap-4">
            <Suspense>
              <OAuthError searchParams={searchParams} />
            </Suspense>
            <GoogleSignInButton action={signInWithGoogleAction} />
            <EmailSignInButton action={signInWithEmailAction} />
          </div>
        </AuthBody>
      </AuthMain>
    </>
  )
}
