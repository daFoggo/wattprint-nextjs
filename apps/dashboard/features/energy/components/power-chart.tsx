"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"
import { TrendChart } from "@workspace/ui/components/hairline/trend-chart"

import { Tile } from "@/components/shared/tile"

type Range = "day" | "week" | "month" | "quarter"
type Point = { ts: number; watts: number }

// What one step of each range is, for the dates in the readout.
const INTERVAL = {
  day: "hour",
  week: "hour",
  month: "day",
  quarter: "day",
} as const

/** Average draw over time, one range or a switch between several (Sense's meter). */
export function PowerChart({
  title,
  description,
  ranges,
  now,
  className,
}: {
  title: string
  description?: string
  ranges: Partial<Record<Range, Point[]>>
  /** When the data was read: the step it falls in is still running and drawn dashed. */
  now: number
  className?: string
}) {
  const t = useTranslations("energy.power")
  const locale = useLocale()
  const keys = Object.keys(ranges) as Range[]
  const [range, setRange] = useState(keys[0]!)
  const points = ranges[range] ?? []
  return (
    <Tile
      title={title}
      description={description}
      className={className}
      action={
        keys.length > 1 ? (
          <SegmentedControl
            label={t("range")}
            size="sm"
            value={range}
            onValueChange={(v) => setRange(v as Range)}
            options={keys.map((k) => ({ value: k, label: t(k) }))}
          />
        ) : null
      }
    >
      <TrendChart
        label={title}
        buckets={points.map((p) => p.ts)}
        values={points.map((p) => p.watts)}
        interval={INTERVAL[range]}
        unit="W"
        format={{ maximumFractionDigits: 0 }}
        now={now}
        locale={locale}
      />
    </Tile>
  )
}
