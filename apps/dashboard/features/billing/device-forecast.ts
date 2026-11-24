import type { DeviceForecast } from "./schemas"

type Day = DeviceForecast["next_days"][number]
type Explain = NonNullable<DeviceForecast["explain"]>
type Factor = Explain["factors"][number]

/** Percent positions of a day's P10–P90 band and its P50 on a track that ends at `max` kWh. */
export function band(
  day: Day,
  max: number
): { low: number; high: number; mid: number } | null {
  if (day.kwh === null || max <= 0) return null
  const at = (v: number) => Math.min(100, Math.max(0, (v / max) * 100))
  return {
    low: at(day.kwh_p10 ?? day.kwh),
    high: at(day.kwh_p90 ?? day.kwh),
    mid: at(day.kwh),
  }
}

/** The track's end: the highest P90 (or P50) of the days. */
export const trackMax = (days: Day[]) =>
  Math.max(0, ...days.map((d) => d.kwh_p90 ?? d.kwh ?? 0))

/** The week's kWh and VND: the sum of its days that have a forecast. */
export function weekTotals(days: Day[]): { kwh: number; amount: number } {
  return days.reduce(
    (t, d) => ({
      kwh: t.kwh + (d.kwh ?? 0),
      amount: t.amount + (d.amount ?? 0),
    }),
    { kwh: 0, amount: 0 }
  )
}

/** The week against the usual: "up" or "down" by `pct` (whole percent), or "same" within 5 %. */
export function versusUsual(e: Explain): {
  dir: "up" | "down" | "same"
  pct: number
} {
  if (e.usual_kwh_day <= 0) return { dir: "same", pct: 0 }
  const change = (e.forecast_kwh_day - e.usual_kwh_day) / e.usual_kwh_day
  const pct = Math.round(Math.abs(change) * 100)
  return { dir: pct < 5 ? "same" : change > 0 ? "up" : "down", pct }
}

/** Which way a factor's evidence moved (colder or warmer, more or fewer days off…); "other" by its effect. */
export function evidenceDir(f: Factor): "up" | "down" {
  if (f.now === null || f.before === null) return f.kwh_day >= 0 ? "up" : "down"
  return f.now >= f.before ? "up" : "down"
}

/** A factor's bar on a two-sided track: its share of the half from the middle (biggest factor = 50 %). */
export function barWidth(f: Factor, factors: Factor[]): number {
  const most = Math.max(...factors.map((x) => Math.abs(x.kwh_day)))
  return most > 0 ? (Math.abs(f.kwh_day) / most) * 50 : 0
}
