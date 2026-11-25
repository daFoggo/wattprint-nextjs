"use client"

import { useTranslations } from "next-intl"

import { cn } from "@workspace/ui/lib/utils"

import type { DemoHome } from "../schemas"
import { DemoHouseScene } from "./demo-house-scene"

/**
 * A row per seeded demo home: a small drawing, its name and appliances, compact enough that a dialog shows every
 * home and its button without scrolling. With `onPick` each row is a button (the picked one says it is opening);
 * without, the rows only show what there is to see.
 */
export function DemoHomeCards({
  homes,
  onPick,
  picked,
  pending = false,
  className,
}: {
  homes: DemoHome[]
  onPick?: (key: string) => void
  picked?: string
  pending?: boolean
  className?: string
}) {
  const t = useTranslations("auth.demo")
  // The home's own line is keyed by the home (messages `homes.<key>`), which the typed keys cannot express.
  const about = (key: string, count: number) =>
    (t as unknown as (k: string, v: { count: number }) => string)(key, {
      count,
    })
  return (
    <ul className={cn("grid gap-2", className)}>
      {homes.map((home) => {
        const busy = pending && picked === home.key
        const body = (
          <>
            <span className="w-20 shrink-0">
              <DemoHouseScene
                labels={home.devices.map((d) => d.label)}
                title={t("scene", {
                  name: home.name,
                  devices: home.devices.map((d) => d.name).join(", "),
                })}
              />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-medium">{home.name}</span>
              <span className="text-sm text-muted-foreground">
                {busy
                  ? t("opening")
                  : t.has(`homes.${home.key}` as never)
                    ? about(`homes.${home.key}`, home.devices.length)
                    : t("devices", { count: home.devices.length })}
              </span>
            </span>
          </>
        )
        const card =
          "flex w-full items-center gap-4 rounded-xl border bg-background px-4 py-2 text-left"
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
