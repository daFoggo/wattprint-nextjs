"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { DonutChart } from "@workspace/ui/components/hairline/donut-chart"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import { DEMO_DEVICES_TODAY, DEMO_DEVICES_WEEK } from "../demo"

const VIEWS = {
  today: {
    data: DEMO_DEVICES_TODAY,
    center: "deviceMix.todaySoFar",
    unit: "kWh",
    digits: 1,
  },
  week: {
    data: DEMO_DEVICES_WEEK,
    center: "last7Days",
    unit: "kWh",
    digits: 1,
  },
} as const

/** Where the power goes, today so far or over the last 7 days (kWh), like Sense's device view. Sample data until NILM runs. */
export function DeviceMix({ className }: { className?: string }) {
  const [view, setView] = useState<keyof typeof VIEWS>("today")
  const t = useTranslations("energy")
  const locale = useLocale()
  const { data, center, unit, digits } = VIEWS[view]
  return (
    <DonutChart
      className={className}
      title={t("deviceMix.title")}
      description={t("deviceMix.description")}
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
      data={data.map((d) => ({ ...d, label: t(`demo.devices.${d.id}`) }))}
      centerLabel={t(center)}
      unit={unit}
      format={{ maximumFractionDigits: digits }}
      locales={locale}
    />
  )
}
