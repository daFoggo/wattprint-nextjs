"use client"

import { IconHome } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { Button } from "@workspace/ui/components/hairline/button"
import { cn } from "@workspace/ui/lib/utils"

import { ResponsiveDialog } from "@/components/shared/responsive-dialog"

import type { DemoHome } from "../schemas"
import { DemoHouseScene } from "./demo-house-scene"
import { FormError } from "./form-error"

/** "Try a demo home": a card per seeded REFIT home; picking one signs in as its owner. */
export function DemoHomesDialog({
  homes,
  action,
}: {
  homes: DemoHome[]
  action: (house: string) => Promise<{ error: string } | void>
}) {
  const t = useTranslations("auth.demo")
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [picked, setPicked] = useState<string>()
  const [pending, startTransition] = useTransition()

  const pick = (key: string) => {
    setError(undefined)
    setPicked(key)
    startTransition(async () => {
      const result = await action(key)
      if (result) setError(result.error)
    })
  }

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
        <div className="flex flex-col gap-4">
          <FormError message={error} />
          <ul
            className={cn("grid gap-4", homes.length > 1 && "sm:grid-cols-2")}
          >
            {homes.map((home) => {
              const busy = pending && picked === home.key
              return (
                <li key={home.key}>
                  <button
                    type="button"
                    disabled={pending}
                    aria-busy={busy}
                    onClick={() => pick(home.key)}
                    className="flex w-full flex-col items-center gap-3 rounded-xl border bg-background p-4 text-left transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
                  >
                    <DemoHouseScene
                      labels={home.devices.map((d) => d.label)}
                      title={t("scene", {
                        name: home.name,
                        devices: home.devices.map((d) => d.name).join(", "),
                      })}
                    />
                    <span className="flex w-full flex-col gap-1">
                      <span className="font-medium">{home.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {busy
                          ? t("signingIn")
                          : t("devices", { count: home.devices.length })}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </ResponsiveDialog>
    </>
  )
}
