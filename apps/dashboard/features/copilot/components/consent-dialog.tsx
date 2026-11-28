"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Button } from "@workspace/ui/components/hairline/button"

import {
  DialogActions,
  ResponsiveDialog,
} from "@/components/shared/responsive-dialog"

import type { Purpose } from "../schemas"

const ROWS = ["what", "to", "where", "note", "who", "off"] as const

/**
 * The invite before anything leaves WattPrint: what is sent, to whom, where, who answers for it and where to turn
 * it off. Its wording changes with the backend's consent version.
 */
export function ConsentDialog({
  purpose,
  onAgree,
  onClose,
}: {
  /** Undefined: closed. The email invite is not this dialog's. */
  purpose?: Purpose
  onAgree: () => Promise<void>
  onClose: () => void
}) {
  const t = useTranslations("copilot.consent")
  // The words stay while the dialog eases out.
  const [shown, setShown] = useState<"wappi" | "voice">("wappi")
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle")
  const next = purpose === "voice" || purpose === "wappi" ? purpose : undefined
  if (next && next !== shown) setShown(next)
  const close = () => {
    setState("idle")
    onClose()
  }
  const agree = () => {
    setState("saving")
    onAgree().then(
      () => setState("idle"),
      (error: unknown) => {
        console.error(error)
        setState("failed")
      }
    )
  }
  return (
    <ResponsiveDialog
      open={!!next}
      onOpenChange={(open) => !open && close()}
      title={t(`${shown}.title`)}
      description={t(`${shown}.description`)}
    >
      <div className="flex flex-col gap-4">
        <dl className="flex flex-col gap-3">
          {ROWS.map((row) => (
            <div key={row} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">
                {t(`labels.${row}`)}
              </dt>
              <dd className="text-sm">{t(`${shown}.${row}`)}</dd>
            </div>
          ))}
        </dl>
        {state === "failed" ? (
          <Alert tone="warning" title={t("failed")} />
        ) : null}
        <DialogActions>
          <Button variant="ghost" onClick={close}>
            {t("later")}
          </Button>
          <Button disabled={state === "saving"} onClick={agree}>
            {t("agree")}
          </Button>
        </DialogActions>
      </div>
    </ResponsiveDialog>
  )
}
