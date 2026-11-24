"use client"

import { IconHome } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { Button } from "@workspace/ui/components/hairline/button"

import { ResponsiveDialog } from "@/components/shared/responsive-dialog"

import type { DemoHome } from "../schemas"
import { DemoHomePicker } from "./demo-home-picker"

/**
 * "View a demo home" on the sign-in page: the seeded REFIT homes, before anyone has an account. Picking one signs
 * the visitor in as a new guest and opens the dashboard on that home, read-only.
 */
export function DemoHomesDialog({
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
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        icon={<IconHome aria-hidden className="size-4 shrink-0" />}
        onClick={() => setOpen(true)}
      >
        {t("open")}
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t("title")}
        description={t("description")}
        size="md"
      >
        <div className="flex flex-col gap-4">
          <DemoHomePicker homes={homes} action={action} />
          <p className="text-sm text-muted-foreground">{t("signInHint")}</p>
        </div>
      </ResponsiveDialog>
    </>
  )
}
