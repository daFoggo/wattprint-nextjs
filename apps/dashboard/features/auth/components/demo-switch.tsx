"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"

import { Button } from "@workspace/ui/components/hairline/button"

import { ResponsiveDialog } from "@/components/shared/responsive-dialog"

import type { DemoHome } from "../schemas"
import { DemoHomePicker } from "./demo-home-picker"

/** "Switch home" for a demo viewer: the picker in a dialog. */
export function DemoSwitch({
  homes,
  action,
}: {
  homes: DemoHome[]
  action: (key: string) => Promise<{ error: string } | void>
}) {
  const t = useTranslations("auth.demo")
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("switch")}
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t("switchTitle")}
        description={t("description")}
        size="lg"
      >
        <DemoHomePicker homes={homes} action={action} />
      </ResponsiveDialog>
    </>
  )
}
