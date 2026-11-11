"use client"

import { useEffect } from "react"
import { Button } from "@workspace/ui/components/hairline/button"
import { linkButton } from "@workspace/ui-patterns/link-button"

import { publicEnv } from "@/lib/env.public"

export default function AuthError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-3xl leading-tight font-normal tracking-tight">
        Something went wrong
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        We could not process your sign-in request right now. Please try again.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={() => retry()}>
          Try again
        </Button>
        <a
          href={publicEnv.NEXT_PUBLIC_LANDING_URL}
          className={linkButton({ variant: "outline" })}
        >
          Back to home
        </a>
      </div>
    </div>
  )
}
