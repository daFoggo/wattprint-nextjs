"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"

/** Sign out row of the account menu; the action redirects to sign-in when done. */
export function SignOutButton({ action }: { action: () => Promise<void> }) {
  const [pending, startTransition] = useTransition()
  const t = useTranslations("auth")
  return (
    <Button
      variant="secondary"
      className="w-full"
      loading={pending}
      statusLabels={{ idle: t("signOut"), pending: t("signingOut") }}
      onClick={() => startTransition(() => action())}
    >
      {t("signOut")}
    </Button>
  )
}
