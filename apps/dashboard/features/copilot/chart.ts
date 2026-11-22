import type { Widget } from "./schemas"

type Chart = Extract<Widget, { kind: "chart" }>
type Series = { id: string; label: string; values: number[] }

/** How a chart widget is drawn: Hairline charts take whole numbers only, so a gap shows the table. */
export type ChartView =
  | { view: "area" | "donut" | "kpi"; series: Series[]; unit?: string }
  | { view: "combo"; series: Series[]; average: number[]; unit?: string }
  | { view: "table" }

export function chartView(chart: Chart): ChartView {
  const series: Series[] = []
  for (const [i, s] of chart.series.entries()) {
    if (s.values.some((v) => v === null)) return { view: "table" }
    series.push({ id: String(i), label: s.label, values: s.values as number[] })
  }
  if (!series.length) return { view: "table" }
  // One unit for the whole chart only when every series is in it (kWh and W never add up).
  const units = new Set(chart.series.map((s) => s.unit))
  const unit =
    units.size === 1 ? (chart.series[0]!.unit ?? undefined) : undefined
  switch (chart.type) {
    case "line":
    case "area":
      return { view: "area", series, unit }
    case "bar": {
      if (series.length > 1) return { view: "area", series, unit }
      const values = series[0]!.values
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      return { view: "combo", series, average: values.map(() => mean), unit }
    }
    case "donut":
      return series.length === 1
        ? { view: "donut", series, unit }
        : { view: "table" }
    case "kpi":
      return { view: "kpi", series, unit }
    case "table":
      return { view: "table" }
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

/** text2sql's time buckets as the dashboard writes them: "13/11" for whole days, "13:00" for hours. */
export function axisLabels(labels: string[], locale: string): string[] {
  if (!labels.every((l) => ISO.test(l))) return labels
  const days = labels.every((l) => l.slice(11, 16) === "00:00")
  const zone = { timeZone: "Asia/Ho_Chi_Minh" } as const
  const day = new Intl.DateTimeFormat(locale, {
    ...zone,
    day: "numeric",
    month: "numeric",
  })
  if (days) return labels.map((l) => day.format(new Date(l)))
  const time = new Intl.DateTimeFormat(locale, {
    ...zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
  // Hours over more than one day need their day, or 00:00…23:00 repeats with nothing to tell them apart.
  const oneDay = new Set(labels.map((l) => day.format(new Date(l)))).size === 1
  return labels.map((l) =>
    oneDay
      ? time.format(new Date(l))
      : `${time.format(new Date(l))} ${day.format(new Date(l))}`
  )
}

/** A table cell in the reader's language: numbers grouped, ISO times as dates (and hours when not midnight). */
export function tableCell(
  value: string | number | null,
  locale: string
): string {
  if (value === null) return ""
  if (typeof value === "number")
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
      value
    )
  // A SQL date arrives as "2026-11-05": UTC midnight, the same day in Hanoi.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  if (!dateOnly && !ISO.test(value)) return value
  const midnight = dateOnly || value.slice(11, 16) === "00:00"
  const date = new Date(value)
  const day = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
  if (midnight) return day
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date)
  return `${time} ${day}`
}
