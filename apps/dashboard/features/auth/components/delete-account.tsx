"use client"

import { useState } from "react"
import { IconTrash } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { ConfirmAction } from "@workspace/ui/components/hairline/confirm-action"

/**
 * Account menu row: the question opens where the icon is (no dialog over the menu). A refusal shows its words
 * under the row and the button says "Try again"; success redirects to sign-in from the action.
 */
export function DeleteAccount({
  action,
}: {
  action: () => Promise<{ error: string } | void>
}) {
  const t = useTranslations("auth.deleteAccount")
  const [error, setError] = useState<string>()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{t("label")}</span>
        <ConfirmAction
          icon={<IconTrash aria-hidden className="size-4" />}
          label={t("ask")}
          labels={{
            idle: t("confirm"),
            pending: t("deleting"),
            success: t("deleted"),
          }}
          tone="danger"
          onConfirm={async () => {
            setError(undefined)
            const result = await action()
            if (result?.error) {
              setError(result.error)
              throw new Error(result.error) // the button then offers Try again
            }
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
