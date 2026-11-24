"use client"

import {
  IconAntennaBars1,
  IconAntennaBars3,
  IconAntennaBars5,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Tooltip } from "@workspace/ui/components/hairline/tooltip"

import type { Device } from "../schemas"

const BARS = {
  high: IconAntennaBars5,
  medium: IconAntennaBars3,
  low: IconAntennaBars1,
} as const

type Level = NonNullable<Device["estimate"]>["level"]

/**
 * After a device's name in the Overview's legend: how far its share can be trusted, as signal bars, the level in a
 * tooltip. Never the scores behind it (a home has no plugs to check against). Not focusable: it sits inside the
 * legend row's button, whose name carries the level (`markLabel`).
 */
export function EstimateMark({ level }: { level: Level }) {
  const t = useTranslations("energy.deviceMix.accuracy")
  const Bars = BARS[level]
  return (
    <Tooltip content={t(`tip.${level}`)}>
      <span className="flex shrink-0 text-muted-foreground">
        <Bars aria-hidden className="size-4" />
      </span>
    </Tooltip>
  )
}
