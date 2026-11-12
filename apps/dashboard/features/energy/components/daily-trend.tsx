import { ComboChart } from "@workspace/ui/components/hairline/combo-chart"

import { dayLabel, type Day } from "../days"

const SPAN = 30
const ROLL = 7

/** The last 30 whole days as bars with their 7-day average; the change chip is against the 30 before. */
export function DailyTrend({
  days,
  className,
}: {
  days: Day[]
  className?: string
}) {
  const whole = days.slice(0, -1) // today is still running
  if (whole.length < SPAN + ROLL) return null
  const start = whole.length - SPAN
  // The average reaches back before the first bar, so the line starts settled.
  const average = whole
    .slice(start)
    .map(
      (_, i) =>
        whole
          .slice(start + i - ROLL + 1, start + i + 1)
          .reduce((s, d) => s + d.value, 0) / ROLL
    )
  const before = whole.slice(Math.max(0, start - SPAN), start)
  return (
    <ComboChart
      className={className}
      title="Energy"
      unit="kWh"
      series={["Daily energy", "7-day average"]}
      days={whole.slice(start).map((d) => ({
        key: d.date,
        label: dayLabel(d.date, { month: "short", day: "numeric" }),
        title: dayLabel(d.date, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
        value: d.value,
      }))}
      average={average}
      previous={
        before.length === SPAN
          ? before.reduce((s, d) => s + d.value, 0)
          : undefined
      }
      format={{ maximumFractionDigits: 1 }}
      locales="en-US"
    />
  )
}
