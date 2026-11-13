"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { DonutChart } from "@workspace/ui/components/hairline/donut-chart"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import { CardLink } from "@/components/shared/nav-links"
import { STATISTICS_PATH } from "@/config/routes"

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
  const locale = useLocale()
  const { center, kwh } = VIEWS[view]
  // The biggest few by name, the rest as one slice, so the tile stays short. Only what drew something counts:
  // early in the day most devices have not run yet.
  const ranked = devices
    .map((d) => ({ id: d.id, label: d.name, value: kwh(d) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
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
        <>
          {t("sample")}{" "}
          <CardLink href={STATISTICS_PATH} className="text-foreground">
            {t("deviceMix.more")}
          </CardLink>
        </>
      }
      action={
        <SegmentedControl
          label={t("deviceMix.period")}
          size="sm"
          value={view}
          onValueChange={(v) => setView(v as keyof typeof VIEWS)}
          options={[
            { value: "today", label: t("today") },
            { value: "week", label: t("week") },
          ]}
        />
      }
      data={slices}
      centerLabel={t(center)}
      unit="kWh"
      format={{ maximumFractionDigits: 1 }}
      locales={locale}
    />
  )
}
