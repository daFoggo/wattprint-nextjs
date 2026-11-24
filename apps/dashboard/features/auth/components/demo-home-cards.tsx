"use client"

import { useTranslations } from "next-intl"

import { cn } from "@workspace/ui/lib/utils"

import type { DemoHome } from "../schemas"
import { DemoHouseScene } from "./demo-house-scene"

/**
 * A card per seeded REFIT home: its drawing, name and appliances. With `onPick` each card is a button (the
 * picked one says it is opening); without, the cards only show what there is to see.
 */
export function DemoHomeCards({
  homes,
  onPick,
  picked,
  pending = false,
}: {
  homes: DemoHome[]
  onPick?: (key: string) => void
  picked?: string
  pending?: boolean
}) {
  const t = useTranslations("auth.demo")
  return (
    <ul className={cn("grid gap-4", homes.length > 1 && "sm:grid-cols-2")}>
      {homes.map((home) => {
        const busy = pending && picked === home.key
        const body = (
          <>
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
                  ? t("opening")
                  : t("devices", { count: home.devices.length })}
              </span>
            </span>
          </>
        )
        const card =
          "flex w-full flex-col items-center gap-3 rounded-xl border bg-background p-4 text-left"
        return (
          <li key={home.key}>
            {onPick ? (
              <button
                type="button"
                disabled={pending}
                aria-busy={busy}
                onClick={() => onPick(home.key)}
                className={cn(
                  card,
                  "transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
                )}
              >
                {body}
              </button>
            ) : (
              <div className={card}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
