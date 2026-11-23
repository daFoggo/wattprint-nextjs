import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { Skeleton } from "@workspace/ui/components/hairline/skeleton"

import { FormError } from "@/features/auth/components/form-error"
import { EmailSignInButton } from "@/features/auth/components/email-sign-in-button"
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button"
import { DemoHomesDialog } from "@/features/auth/components/demo-homes-dialog"
import { getDemoHomes } from "@/features/auth/queries"

import {
  signInAsDemoHomeAction,
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

/** Only when the backend has a seeded demo home (it reads the database, so it streams in). */
async function DemoHomes() {
  const homes = await getDemoHomes()
  if (homes.length === 0) return null
  return <DemoHomesDialog homes={homes} action={signInAsDemoHomeAction} />
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
        <AuthPitch title={t("pitchTitle")}>{t("pitchBody")}</AuthPitch>
      </AuthAside>
      <AuthMain>
        <AuthHeader />
        <AuthBody>
          <AuthHeading title={t("title")}>{t("subtitle")}</AuthHeading>
          <div className="flex flex-col gap-4">
            <Suspense>
              <OAuthError searchParams={searchParams} />
            </Suspense>
            <GoogleSignInButton action={signInWithGoogleAction} />
            <EmailSignInButton action={signInWithEmailAction} />
            <Suspense fallback={<Skeleton height={40} />}>
              <DemoHomes />
            </Suspense>
          </div>
        </AuthBody>
      </AuthMain>
    </>
  )
}
