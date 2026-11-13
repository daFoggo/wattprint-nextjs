import { useLocale, useTranslations } from "next-intl"

import { TrendChart } from "@workspace/ui/components/hairline/trend-chart"

import { Tile } from "@/components/shared/tile"

import { dateStart, DAY, localDate, monthBefore, type Day } from "../days"

const running = (values: number[]) => {
  let sum = 0
  return values.map((v) => (sum += v))
}

/**
 * The billing cycle so far as a running total against the cycle before, day for day (Sense's "this month
 * vs last"). The change counts whole days only: today is still running.
 */
export function CycleCompare({
  days,
  start,
  now,
  className,
}: {
  days: Day[]
  /** First day of the running cycle, "YYYY-MM-DD". */
  start: string
  now: number
  className?: string
}) {
  const t = useTranslations("energy.cycleCompare")
  const locale = useLocale()
  const current = days.filter((d) => d.date >= start)
  if (!current.length) return null
  const kwh = new Map(days.map((d) => [d.date, d.value]))
  const before = dateStart(monthBefore(start))
  const previous = current.map(
    (_, i) => kwh.get(localDate(before + i * DAY)) ?? 0
  )
  const total = running(current.map((d) => d.value))
  const was = running(previous)
  const whole = current.length - 1
  const change =
    whole && was[whole - 1] ? total[whole - 1]! / was[whole - 1]! - 1 : null
  const pct = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  })
  return (
    <Tile
      title={t("title")}
      description={
        change === null
          ? t("noChange")
          : t(change <= 0 ? "less" : "more", {
              pct: pct.format(Math.abs(change)),
            })
      }
      className={className}
    >
      <TrendChart
        label={t("title")}
        buckets={current.map((d) => dateStart(d.date))}
        values={total}
        previous={was}
        previousLabel={t("previous")}
        interval="day"
        unit="kWh"
        format={{ maximumFractionDigits: 1 }}
        now={now}
        locale={locale}
      />
    </Tile>
  )
}
