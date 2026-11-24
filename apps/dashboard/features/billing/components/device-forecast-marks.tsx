"use client"

import {
  IconAntennaBars1,
  IconAntennaBars3,
  IconAntennaBars5,
  IconBulb,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Tooltip } from "@workspace/ui/components/hairline/tooltip"

import type { DeviceForecast } from "../schemas"

// A client component: the tooltips read their trigger's props, which an element made on the server does not carry.
const BARS = {
  high: IconAntennaBars5,
  medium: IconAntennaBars3,
  low: IconAntennaBars1,
} as const

/**
 * Beside a device's row in this month's cost: how certain its forecast is (signal bars, the measured error in the
 * tooltip) and a bulb when it has priced advice. The figures wait in `DeviceForecastCard`.
 */
export function DeviceForecastMarks({ device: d }: { device: DeviceForecast }) {
  const t = useTranslations("billing.deviceForecast")
  const Bars = BARS[d.confidence]
  const level = t(`confidence.${d.confidence}`)
  const certainty = [
    d.error_pct === null
      ? t("certaintyNew", { level })
      : t("certainty", { level }),
    d.simulated ? t("simulatedNote") : null,
  ]
    .filter(Boolean)
    .join(". ")
  return (
    <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
      <Tooltip content={certainty}>
        <span tabIndex={0} role="img" aria-label={certainty} className={MARK}>
          <Bars aria-hidden className="size-4" />
        </span>
      </Tooltip>
      {d.advice.length ? (
        <Tooltip content={t("hasTip")}>
          <span
            tabIndex={0}
            role="img"
            aria-label={t("hasTip")}
            className={MARK}
          >
            <IconBulb aria-hidden className="size-4 text-primary" />
          </span>
        </Tooltip>
      ) : null}
    </span>
  )
}

const MARK =
  "inline-flex size-6 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
