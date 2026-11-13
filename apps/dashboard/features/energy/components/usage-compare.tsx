"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { CompareBars } from "@workspace/ui/components/hairline/compare-bars"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import { comparePeriods, dayLabel, type Day } from "../days"

const short = { month: "short", day: "numeric" } as const

const MODES = {
  week: {
    size: 1,
    count: 7,
    currentLabel: "last7Days",
    previousLabel: "usageCompare.weekBefore",
    label: (locale: string, first: string) =>
      dayLabel(first, locale, { weekday: "short" }),
    title: (locale: string, first: string) => dayLabel(first, locale),
  },
  month: {
    size: 7,
    count: 4,
    currentLabel: "usageCompare.last4Weeks",
    previousLabel: "usageCompare.fourWeeksBefore",
    label: (locale: string, first: string) => dayLabel(first, locale, short),
    title: (locale: string, first: string, last: string) =>
      `${dayLabel(first, locale, short)} – ${dayLabel(last, locale, short)}`,
  },
} as const

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
  const t = useTranslations("energy")
  const locale = useLocale()
  const [mode, setMode] = useState<keyof typeof MODES>("week")
  const m = MODES[mode]
  const whole = days.slice(0, -1)
  const pairs = comparePeriods(whole, m.size, m.count)
  if (!pairs) return null
  const hasMonth = whole.length >= 2 * MODES.month.size * MODES.month.count
  return (
    <CompareBars
      className={className}
      title={t("usageCompare.title")}
      unit="kWh"
      action={
        hasMonth && (
          <SegmentedControl
            label={t("usageCompare.compareBy")}
            size="sm"
            value={mode}
            onValueChange={(v) => setMode(v as keyof typeof MODES)}
            options={[
              { value: "week", label: t("week") },
              { value: "month", label: t("usageCompare.month") },
            ]}
          />
        )
      }
      currentLabel={t(m.currentLabel)}
      previousLabel={t(m.previousLabel)}
      defaultCompared
      // Keyed by position, so switching Week/Month glides the bars instead of replacing them.
      data={pairs.map((p, i) => ({
        key: String(i),
        label: m.label(locale, p.first),
        title: m.title(locale, p.first, p.last),
        current: p.current,
        previous: p.previous,
      }))}
      format={{ maximumFractionDigits: 1 }}
      locales={locale}
    />
  )
}
