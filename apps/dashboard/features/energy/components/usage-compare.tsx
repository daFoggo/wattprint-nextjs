"use client"

import { useState } from "react"

import { CompareBars } from "@workspace/ui/components/hairline/compare-bars"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import { comparePeriods, dayLabel, type Day } from "../days"

const short = { month: "short", day: "numeric" } as const

const MODES = {
  week: {
    size: 1,
    count: 7,
    currentLabel: "Last 7 days",
    previousLabel: "Week before",
    label: (first: string) => dayLabel(first, { weekday: "short" }),
    title: (first: string) => dayLabel(first),
  },
  month: {
    size: 7,
    count: 4,
    currentLabel: "Last 4 weeks",
    previousLabel: "4 weeks before",
    label: (first: string) => dayLabel(first, short),
    title: (first: string, last: string) =>
      `${dayLabel(first, short)} – ${dayLabel(last, short)}`,
  },
}

/**
 * Whole days (today is still running, so it sits out) against the period before, compared from
 * the start: day by day over a week, or week by week over four.
 */
export function UsageCompare({
  days,
  className,
}: {
  days: Day[]
  className?: string
}) {
  const [mode, setMode] = useState<keyof typeof MODES>("week")
  const m = MODES[mode]
  const whole = days.slice(0, -1)
  const pairs = comparePeriods(whole, m.size, m.count)
  if (!pairs) return null
  const hasMonth = whole.length >= 2 * MODES.month.size * MODES.month.count
  return (
    <CompareBars
      className={className}
      title="Energy use"
      unit="kWh"
      action={
        hasMonth && (
          <SegmentedControl
            label="Compare by"
            size="sm"
            value={mode}
            onValueChange={(v) => setMode(v as keyof typeof MODES)}
            options={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        )
      }
      currentLabel={m.currentLabel}
      previousLabel={m.previousLabel}
      defaultCompared
      // Keyed by position, so switching Week/Month glides the bars instead of replacing them.
      data={pairs.map((p, i) => ({
        key: String(i),
        label: m.label(p.first),
        title: m.title(p.first, p.last),
        current: p.current,
        previous: p.previous,
      }))}
      format={{ maximumFractionDigits: 1 }}
      locales="en-US"
    />
  )
}
