"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"
import { Input } from "@workspace/ui/components/hairline/input"

/** An invite code and the button that joins its home. */
export function JoinHome({
  action,
}: {
  action: (code: string) => Promise<{ error: string } | void>
}) {
  const t = useTranslations("home.join")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string>()
  const [joining, start] = useTransition()
  return (
    <form
      className="flex max-w-md flex-wrap items-start gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        setError(undefined)
        start(async () => {
          const result = await action(code)
          if (result?.error) setError(result.error)
        })
      }}
    >
      <Input
        label={t("label")}
        hint={t("hint")}
        error={error}
        value={code}
        onValueChange={setCode}
        maxLength={32}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="min-w-0 flex-1"
      />
      <Button type="submit" disabled={joining || !code.trim()} className="mt-6">
        {t("submit")}
      </Button>
    </form>
  )
}
