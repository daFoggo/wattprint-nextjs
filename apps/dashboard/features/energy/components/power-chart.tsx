"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { EmptyState } from "@workspace/ui/components/hairline/empty-state"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"
import { TrendChart } from "@workspace/ui/components/hairline/trend-chart"

import { ChartKey } from "@/components/shared/chart-key"
import { Tile } from "@/components/shared/tile"

import { startRange, type Point, type Range } from "../power"

// What one step of each range is, for the dates in the readout.
const INTERVAL = {
  day: "hour",
  week: "hour",
  month: "day",
  quarter: "day",
} as const

/** Average draw over time, one range or a switch between several (Sense's meter); a range with no readings says so. */
export function PowerChart({
  title,
  description,
  ranges,
  usual,
  now,
  className,
}: {
  title: string
  description?: string
  ranges: Partial<Record<Range, Point[]>>
  /** The home's usual draw under each step of a range (the usage model's P50), drawn as the comparison line. */
  usual?: Partial<Record<Range, number[]>>
  /** When the data was read: the step it falls in is still running and drawn dashed. */
  now: number
  className?: string
}) {
  const t = useTranslations("energy.power")
  const k = useTranslations("energy.chartKey")
  const locale = useLocale()
  const keys = Object.keys(ranges) as Range[]
  const [range, setRange] = useState(() => startRange(ranges))
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
      {points.length ? (
        <>
          <TrendChart
            label={title}
            buckets={points.map((p) => p.ts)}
            values={points.map((p) => p.watts)}
            previous={usual?.[range] ?? null}
            previousLabel={t("usual")}
            interval={INTERVAL[range]}
            unit="W"
            format={{ maximumFractionDigits: 0 }}
            now={now}
            locale={locale}
          />
          <ChartKey
            items={[
              { label: k("now") },
              ...(usual?.[range]
                ? [{ label: t("usual"), dashed: true, muted: true }]
                : []),
              { label: k("unfinished"), dashed: true },
            ]}
          />
        </>
      ) : (
        <EmptyState
          scene="chart"
          title={t("emptyTitle")}
          description={t(keys.length > 1 ? "emptyDescription" : "emptyDay")}
        />
      )}
    </Tile>
  )
}
