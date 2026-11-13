import { useLocale, useTranslations } from "next-intl"

import { TrendChart } from "@workspace/ui/components/hairline/trend-chart"

import { Tile } from "@/components/shared/tile"

import { backgroundLoad, dateStart, localDate } from "../days"

const HOURS_A_YEAR = 8_760

/**
 * The background load (Sense's "Always on"): each day's lowest draw, the energy it adds up to over a year and,
 * with the cycle's average price, what it costs (the level: `backgroundLoad`).
 */
export function Standby({
  baseline,
  price,
  now,
  className,
}: {
  baseline: { date: string; watts: number }[]
  /** VND per kWh, VAT included; leaves out the cost when the home has no tariff. */
  price: number | null
  now: number
  className?: string
}) {
  const t = useTranslations("energy.standby")
  const locale = useLocale()
  // Whole days only: today's lowest so far covers a few hours.
  const last = baseline.filter((d) => d.date < localDate(now)).slice(-30)
  const watts = backgroundLoad(baseline, now)
  if (watts === null) return null
  const kwh = (watts * HOURS_A_YEAR) / 1000
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const vnd = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  })
  const stats = [
    { label: t("level"), value: `${number.format(watts)} W` },
    { label: t("year"), value: `${number.format(kwh)} kWh` },
    ...(price ? [{ label: t("cost"), value: vnd.format(kwh * price) }] : []),
  ]
  return (
    <Tile
      title={t("title")}
      description={t("description")}
      className={className}
    >
      <dl className="flex flex-wrap gap-x-8 gap-y-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse gap-1">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="text-2xl font-medium tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      <TrendChart
        label={t("chart")}
        buckets={last.map((d) => dateStart(d.date))}
        values={last.map((d) => d.watts)}
        interval="day"
        unit="W"
        format={{ maximumFractionDigits: 0 }}
        now={now}
        locale={locale}
      />
    </Tile>
  )
}
