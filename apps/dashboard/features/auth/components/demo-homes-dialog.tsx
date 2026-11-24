"use client"

import { IconHome } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { useState, type ReactNode } from "react"

import { Button } from "@workspace/ui/components/hairline/button"

import { ResponsiveDialog } from "@/components/shared/responsive-dialog"

import type { DemoHome } from "../schemas"
import { DemoHomeCards } from "./demo-home-cards"

/**
 * "View a demo home" on the sign-in page: the seeded REFIT homes, shown before anyone has an account. A visitor
 * signs in (or signs up) with their own account first, then picks one on the dashboard: read-only.
 */
export function DemoHomesDialog({
  homes,
  children,
}: {
  homes: DemoHome[]
  /** The sign-in control (a form posting the email sign-in action). */
  children: ReactNode
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
        size={homes.length > 1 ? "lg" : "md"}
      >
        <div className="flex flex-col gap-5">
          <DemoHomeCards homes={homes} />
          <p className="text-sm text-muted-foreground">{t("signInHint")}</p>
          {children}
        </div>
      </ResponsiveDialog>
    </>
  )
}
