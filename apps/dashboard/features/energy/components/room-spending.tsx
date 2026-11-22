"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { SpendingRing } from "@workspace/ui/components/hairline/spending-ring"

import { CardLink } from "@/components/shared/nav-links"
import { Tile } from "@/components/shared/tile"
import { DEVICES_PATH } from "@/config/routes"

import { roomSpending } from "../rooms"
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
 * With no room that opens into devices, the tile is titled by device.
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
  const { data, byRoom } = roomSpending(devices)
  return (
    <Tile
      title={
        open
          ? t("roomTitle", { room: open })
          : t(byRoom ? "title" : "byDeviceTitle")
      }
      description={open ? t("roomHint") : t(byRoom ? "hint" : "byDeviceHint")}
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
