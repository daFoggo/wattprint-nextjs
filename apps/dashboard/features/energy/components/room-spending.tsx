"use client"

import { IconChevronRight } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { HoverCard } from "@workspace/ui/components/hairline/hover-card"
import { SpendingRing } from "@workspace/ui/components/hairline/spending-ring"

import { DeviceIcon } from "@/components/shared/device-icon"
import { CardLink } from "@/components/shared/nav-links"
import { Tile } from "@/components/shared/tile"
import { DEVICES_PATH } from "@/config/routes"
import { Link } from "@/i18n/navigation"

import { roomSpending } from "../rooms"
import type { Device } from "../schemas"

const VND = {
  style: "currency",
  currency: "VND",
  notation: "compact",
  maximumFractionDigits: 0,
} as const

/** The ring's own palette, set on every slice so the list beside it uses the same colours. */
const colour = (i: number) => `var(--chart-${(i % 5) + 1})`

const NAME =
  "min-w-0 rounded-sm font-medium break-words underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

/** What a device's row shows beyond its cost, rendered by the page: marks beside the name, a card on hover. */
export type DeviceExtra = { marks: React.ReactNode; card: React.ReactNode }

/**
 * This cycle's cost so far by room, each room opening into its devices (Sense groups devices by room); with no room
 * that opens into devices, by device. The ring beside one row per slice: its colour, its name, its share and its cost.
 * A device's forecast stays out of sight (progressive disclosure): its certainty and a tip as marks, the figures in a
 * hover card on its name, which on touch is a plain link to the device's page (where all of it is too).
 */
export function RoomSpending({
  devices,
  extras,
  className,
}: {
  devices: Device[]
  extras?: Record<string, DeviceExtra>
  className?: string
}) {
  const t = useTranslations("energy.roomSpending")
  const locale = useLocale()
  const money = new Intl.NumberFormat(locale, VND)
  const pct = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  })
  const [open, setOpen] = useState<string | null>(null)
  const { data: raw, byRoom } = roomSpending(devices)
  const data = raw.map((c, i) => ({
    ...c,
    color: colour(i),
    children: c.children?.map((d, j) => ({ ...d, color: colour(j) })),
  }))
  const types = new Map(devices.map((d) => [d.id, d.type]))
  const opened = data.find((c) => c.id === open)
  const rows = opened?.children ?? data
  const total = rows.reduce((s, c) => s + c.value, 0)
  return (
    <Tile
      title={
        opened
          ? t("roomTitle", { room: opened.label })
          : t(byRoom ? "title" : "byDeviceTitle")
      }
      description={opened ? t("roomHint") : t(byRoom ? "hint" : "byDeviceHint")}
      className={className}
      action={<CardLink href={DEVICES_PATH}>{t("allDevices")}</CardLink>}
    >
      <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
        <SpendingRing
          className="justify-self-center"
          label={t("label")}
          data={data}
          open={open}
          onOpenChange={setOpen}
          format={VND}
          locales={locale}
        />
        <ul className="flex min-w-0 flex-col">
          {rows.map((c) => {
            const extra = extras?.[c.id]
            const link = (
              <Link
                href={`${DEVICES_PATH}/${encodeURIComponent(c.id)}`}
                className={NAME}
              >
                {c.label}
              </Link>
            )
            return (
              <li
                key={c.id}
                className="flex min-h-10 min-w-0 items-center gap-2.5 py-1 text-sm"
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: c.color }}
                />
                {types.has(c.id) ? (
                  <DeviceIcon type={types.get(c.id)!} size="sm" />
                ) : null}
                {"children" in c && c.children ? (
                  <button
                    type="button"
                    onClick={() => setOpen(c.id)}
                    className={`${NAME} flex items-center gap-1`}
                  >
                    {c.label}
                    <IconChevronRight
                      aria-hidden
                      className="size-4 text-muted-foreground"
                    />
                  </button>
                ) : extra ? (
                  <HoverCard
                    content={
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                          {c.label}
                        </p>
                        {extra.card}
                      </div>
                    }
                  >
                    {link}
                  </HoverCard>
                ) : (
                  link
                )}
                {extra?.marks}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                  {pct.format(total ? c.value / total : 0)}
                </span>
                <span className="min-w-16 shrink-0 text-right font-medium tabular-nums">
                  {money.format(c.value)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </Tile>
  )
}
