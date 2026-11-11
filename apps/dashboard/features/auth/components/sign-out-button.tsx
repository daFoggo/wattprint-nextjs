"use client"

import { useTransition } from "react"

import { Button } from "@workspace/ui/components/hairline/button"

/** Sign out row of the account menu; the action redirects to sign-in when done. */
export function SignOutButton({ action }: { action: () => Promise<void> }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="secondary"
      className="w-full"
      loading={pending}
      statusLabels={{ idle: "Sign out", pending: "Signing out" }}
      onClick={() => startTransition(() => action())}
    >
      Sign out
    </Button>
  )
}
