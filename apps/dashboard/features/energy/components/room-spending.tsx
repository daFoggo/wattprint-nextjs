"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import {
  SpendingRing,
  type SpendCategory,
} from "@workspace/ui/components/hairline/spending-ring"

import { CardLink } from "@/components/shared/nav-links"
import { Tile } from "@/components/shared/tile"
import { DEVICES_PATH } from "@/config/routes"

import type { Device } from "../schemas"

const VND = {
  style: "currency",
  currency: "VND",
  notation: "compact",
  maximumFractionDigits: 0,
} as const

/**
 * This month's cost by room, each room opening into its devices (Sense groups devices by room). A room
 * with one device and the devices with no room (always on, other) are tiles of their own. While a room is open
 * the header names it, and a small "All" heads the list (a local patch), where the hand is after picking a row.
 */
export function RoomSpending({
  devices,
  className,
}: {
  devices: Device[]
  className?: string
}) {
  const t = useTranslations("energy.roomSpending")
  const locale = useLocale()
  const [open, setOpen] = useState<string | null>(null)
  const rooms = new Map<string, Device[]>()
  for (const d of devices) {
    if (d.month_amount <= 0) continue
    rooms.set(d.room ?? d.id, [...(rooms.get(d.room ?? d.id) ?? []), d])
  }
  const data: SpendCategory[] = [...rooms.entries()]
    .map(([room, list]) =>
      list.length === 1
        ? {
            id: list[0]!.id,
            label: list[0]!.room ?? list[0]!.name,
            value: list[0]!.month_amount,
          }
        : {
            id: room,
            label: room,
            value: list.reduce((s, d) => s + d.month_amount, 0),
            children: list
              .map((d) => ({ id: d.id, label: d.name, value: d.month_amount }))
              .sort((a, b) => b.value - a.value),
          }
    )
    .sort((a, b) => b.value - a.value)
  return (
    <Tile
      title={open ? t("roomTitle", { room: open }) : t("title")}
      description={open ? t("roomHint") : t("hint")}
      className={className}
      action={<CardLink href={DEVICES_PATH}>{t("allDevices")}</CardLink>}
    >
      <SpendingRing
        className="self-center"
        label={t("label")}
        data={data}
        open={open}
        onOpenChange={setOpen}
        format={VND}
        locales={locale}
        legend
      />
    </Tile>
  )
}
