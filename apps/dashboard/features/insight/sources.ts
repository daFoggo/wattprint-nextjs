import type { ThresholdLineDatum } from "@workspace/ui/components/hairline/threshold-line"

/** VND per kWh of the running cycle, VAT included; null before there is a bill to price by. */
export function avgPrice(
  bill: { kwh: number; amount_total: number } | null
): number | null {
  return bill && bill.kwh > 0 ? bill.amount_total / bill.kwh : null
}

/** A money threshold as the kWh it stands for, to a tenth (the alert is stored in kWh). */
export function toKwh(vnd: number, price: number): number {
  return Math.round((vnd / price) * 10) / 10
}

/** What an alert can be set on, with the history to draw its threshold over. */
export type AlertSource = {
  key: "daily" | "cycle" | "power"
  metric: "today_kwh" | "bill_vnd" | "power_w"
  /** The unit the line is drawn and set in; `vnd` on a kWh metric is converted back on save. */
  unit: "vnd" | "kwh" | "w"
  data: ThresholdLineDatum[]
  /** The figure now (today so far, this cycle so far, power now), in `unit`; null when unknown. */
  now: number | null
}

const ICT = "Asia/Ho_Chi_Minh"

/**
 * The builder's three sources: each whole day's cost (or kWh without a price) of the last 30 days, the past
 * cycles' bills, and the last week's hourly power. Today is the figure now, not a bar: it is not over yet.
 */
export function alertSources({
  days,
  bills,
  power,
  price,
  locale,
  billNow = null,
  powerNow = null,
}: {
  days: { date: string; value: number }[]
  bills: { month: string; amount: number }[]
  power: { ts: number; watts: number }[]
  price: number | null
  locale: string
  billNow?: number | null
  powerNow?: number | null
}): AlertSource[] {
  const day = (d: string, o: Intl.DateTimeFormatOptions) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString(locale, {
      ...o,
      timeZone: "UTC",
    })
  const money = (kwh: number) => (price ? Math.round(kwh * price) : kwh)
  const whole = days.slice(0, -1).slice(-30)
  const today = days.at(-1)
  const hours = new Map<number, number>()
  for (const p of power) {
    const hour = p.ts - (p.ts % 3_600_000)
    hours.set(hour, Math.max(hours.get(hour) ?? 0, p.watts))
  }
  const time = (ts: number, o: Intl.DateTimeFormatOptions) =>
    new Date(ts).toLocaleString(locale, { ...o, timeZone: ICT })
  return [
    {
      key: "daily",
      metric: "today_kwh",
      unit: price ? "vnd" : "kwh",
      data: whole.map((d) => ({
        key: d.date,
        value: money(d.value),
        label: day(d.date, {
          weekday: "short",
          day: "numeric",
          month: "numeric",
        }),
        tick: day(d.date, { day: "numeric", month: "numeric" }),
      })),
      now: today ? money(today.value) : null,
    },
    {
      key: "cycle",
      metric: "bill_vnd",
      unit: "vnd",
      data: bills.slice(-12).map((b) => ({
        key: b.month,
        value: b.amount,
        label: b.month,
        tick: b.month.slice(5),
      })),
      now: billNow,
    },
    {
      key: "power",
      metric: "power_w",
      unit: "w",
      data: [...hours].map(([ts, watts]) => ({
        key: String(ts),
        value: Math.round(watts),
        label: time(ts, {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        tick: time(ts, { hour: "2-digit", hourCycle: "h23" }),
      })),
      now: powerNow,
    },
  ]
}

/**
 * The line's step (1, 2 or 5 × a power of ten, about a fortieth of the highest value, as the line snaps) and
 * where it starts: the upper quartile of the history on a step, so it would have fired on the heavy days only.
 * The tag and the sentence under the chart then show the same number.
 */
export function lineScale(values: number[]): { step: number; start: number } {
  const highest = Math.max(...values, 0)
  const raw = highest / 40 || 1
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10]
    .map((m) => m * power)
    .reduce((a, b) => (Math.abs(b - raw) < Math.abs(a - raw) ? b : a))
  const sorted = [...values].sort((a, b) => a - b)
  const usual = sorted[Math.floor((sorted.length - 1) * 0.75)] ?? 0
  const start = Math.round(Math.round(usual / step) * step * 1e6) / 1e6
  return { step: Math.round(step * 1e6) / 1e6, start }
}
