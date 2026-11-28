"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Button } from "@workspace/ui/components/hairline/button"

import {
  DialogActions,
  ResponsiveDialog,
} from "@/components/shared/responsive-dialog"

/**
 * One kind of thing to delete: what it is, and a button that opens a dialog saying what is lost. With `onConfirm`
 * the dialog deletes (an answer is a refusal to show); without it `children` holds the control that does.
 */
export function DeleteRow({
  title,
  hint,
  open: openLabel,
  question,
  loses,
  disabled,
  onConfirm,
  controls,
  children,
}: {
  title: string
  hint: string
  /** The row button's words. */
  open: string
  question: string
  loses: string[]
  disabled?: boolean
  onConfirm?: () => Promise<string | void>
  /** Choices shown on the row, before the button. */
  controls?: React.ReactNode
  children?: React.ReactNode
}) {
  const t = useTranslations("privacy.delete")
  const [shown, setShown] = useState(false)
  const [state, setState] = useState<"idle" | "deleting" | "done">("idle")
  const [error, setError] = useState<string>()
  const confirm = async () => {
    setState("deleting")
    setError(undefined)
    try {
      const refused = await onConfirm!()
      if (refused) {
        setError(refused)
        setState("idle")
      } else {
        setShown(false)
        setState("done")
      }
    } catch (failure) {
      console.error(failure)
      setError(t("failed"))
      setState("idle")
    }
  }
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {controls}
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setError(undefined)
            setState("idle")
            setShown(true)
          }}
        >
          {openLabel}
        </Button>
        {state === "done" ? (
          <p role="status" className="text-xs text-muted-foreground">
            {t("done")}
          </p>
        ) : null}
      </div>
      <ResponsiveDialog
        open={shown}
        onOpenChange={setShown}
        title={question}
        description={t("noUndo")}
      >
        <div className="flex flex-col gap-4">
          <ul className="flex list-disc flex-col gap-2 pl-4 text-sm">
            {loses.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {error ? <Alert tone="warning" title={error} /> : null}
          {children}
          <DialogActions>
            <Button variant="ghost" onClick={() => setShown(false)}>
              {t("cancel")}
            </Button>
            {onConfirm ? (
              <Button
                variant="destructive"
                disabled={state === "deleting"}
                onClick={confirm}
              >
                {t("confirm")}
              </Button>
            ) : null}
          </DialogActions>
        </div>
      </ResponsiveDialog>
    </div>
  )
}
