"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { DonutChart } from "@workspace/ui/components/hairline/donut-chart"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import { IconLink } from "@/components/shared/icon-link"
import { ModelBadge } from "@/components/shared/model-badge"
import { STATISTICS_PATH } from "@/config/routes"

import { mixConfidence, otherShare } from "../confidence"
import { EstimateMark } from "./estimate-mark"
import type { Device } from "../schemas"

const TOP = 5

const VIEWS = {
  today: { center: "deviceMix.todaySoFar", kwh: (d: Device) => d.today_kwh },
  week: {
    center: "last7Days",
    kwh: (d: Device) => d.week_kwh.reduce((s, v) => s + v, 0),
  },
} as const

/** Where the power goes, today so far or over the last 7 days (kWh), like Sense's device view; leads to the statistics. */
export function DeviceMix({
  devices,
  className,
}: {
  devices: Device[]
  className?: string
}) {
  // The week by default: a day only hours old says little about where the power goes.
  const [view, setView] = useState<keyof typeof VIEWS>("week")
  const t = useTranslations("energy")
  const tl = useTranslations("energy.deviceMix.accuracy")
  const locale = useLocale()
  const { center, kwh } = VIEWS[view]
  // The biggest few by name, the rest as one slice, so the tile stays short. Only what drew something counts:
  // early in the day most devices have not run yet.
  const ranked = devices
    .map((d) => ({
      id: d.id,
      label: d.name,
      value: kwh(d),
      ...(d.estimate && {
        mark: <EstimateMark key={d.id} level={d.estimate.level} />,
        markLabel: tl(`levelLong.${d.estimate.level}`),
      }),
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
  const other = otherShare(devices.map((d) => ({ type: d.type, kwh: kwh(d) })))
  const pct = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  })
  const rest = ranked.slice(TOP)
  const slices =
    rest.length > 1
      ? [
          ...ranked.slice(0, TOP),
          {
            id: "rest",
            label: t("deviceMix.rest", { count: rest.length }),
            value: rest.reduce((s, d) => s + d.value, 0),
          },
        ]
      : ranked
  return (
    <DonutChart
      className={className}
      title={t("deviceMix.title")}
      description={
        <span className="flex flex-col items-start gap-1.5">
          <ModelBadge kind="estimate" confidence={mixConfidence(other)} />
          <span>
            {t("estimated")} {t("deviceMix.why", { pct: pct.format(other) })}
          </span>
        </span>
      }
      action={
        <div className="flex items-center gap-2">
          <SegmentedControl
            label={t("deviceMix.period")}
            size="sm"
            value={view}
            onValueChange={(v) => setView(v as keyof typeof VIEWS)}
            options={[
              { value: "today", label: t("today") },
              { value: "week", label: t("last7Days") },
            ]}
          />
          <IconLink href={STATISTICS_PATH} label={t("deviceMix.more")} />
        </div>
      }
      data={slices}
      centerLabel={t(center)}
      unit="kWh"
      format={{ maximumFractionDigits: 1 }}
      locales={locale}
    />
  )
}
