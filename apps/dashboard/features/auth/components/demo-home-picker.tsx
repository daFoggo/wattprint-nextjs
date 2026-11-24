"use client"

import { useState, useTransition } from "react"

import type { DemoHome } from "../schemas"
import { DemoHomeCards } from "./demo-home-cards"
import { FormError } from "./form-error"

/** Picking a card views that demo home read-only from this account (the action opens the dashboard on it). */
export function DemoHomePicker({
  homes,
  action,
}: {
  homes: DemoHome[]
  action: (key: string) => Promise<{ error: string } | void>
}) {
  const [error, setError] = useState<string>()
  const [picked, setPicked] = useState<string>()
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex flex-col gap-4">
      <FormError message={error} />
      <DemoHomeCards
        homes={homes}
        picked={picked}
        pending={pending}
        onPick={(key) => {
          setError(undefined)
          setPicked(key)
          startTransition(async () => {
            const result = await action(key)
            if (result) setError(result.error)
          })
        }}
      />
    </div>
  )
}
