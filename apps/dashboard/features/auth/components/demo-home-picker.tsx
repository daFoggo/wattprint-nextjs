"use client"

import { useState, useTransition } from "react"

import type { DemoHome } from "../schemas"
import { DemoHomeCards } from "./demo-home-cards"
import { FormError } from "./form-error"

/** Picking a card runs `action` with its key (it views the home, or remembers it while the visitor signs in). */
export function DemoHomePicker({
  homes,
  action,
  className,
}: {
  homes: DemoHome[]
  action: (key: string) => Promise<{ error: string } | void>
  className?: string
}) {
  const [error, setError] = useState<string>()
  const [picked, setPicked] = useState<string>()
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex flex-col gap-4">
      <FormError message={error} />
      <DemoHomeCards
        homes={homes}
        className={className}
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
