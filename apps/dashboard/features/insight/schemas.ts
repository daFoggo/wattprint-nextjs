import { z } from "zod"

/**
 * GET /insights/cohort: similar homes over the `days` whole days ending `period`, how many, their energy at the
 * 10th…90th percentile and this home's over the same days (kWh; null when its meter missed over 10 %).
 */
export const CohortSchema = z.object({
  cohort_key: z.string(),
  period: z.string(),
  homes: z.number(),
  days: z.number(),
  p10: z.number(),
  p33: z.number(),
  p66: z.number(),
  p90: z.number(),
  kwh: z.number().nullable(),
})
export type Cohort = z.infer<typeof CohortSchema>

/** GET /insights/alerts: what a detector found; the text comes from `kind`, its figures from `payload`. */
export const AlertSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "longer_than_usual",
    "standby_high",
    "tier_near",
    "unexplained_load",
    "watch_hit",
    "watch_broken",
    "device_on",
    "device_off",
    "device_long_run",
    "device_high_power",
    "usage_anomaly",
    "device_anomaly",
  ]),
  severity: z.enum(["info", "warning", "critical"]),
  /** acknowledged: seen, off the Overview; resolved: the detector found the cause gone. */
  status: z.enum(["open", "acknowledged", "resolved"]),
  ts: z.iso.datetime({ offset: true }).transform((v) => Date.parse(v)),
  /** `type` is cat_device_type.code, for its icon. */
  device: z
    .object({ id: z.string(), name: z.string(), type: z.string() })
    .nullable(),
  /** Figures; a watch the user set through Wappi also brings its `label`, `op` (gt/lt) and `unit`. */
  payload: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
  /** The viewer's own verdict on a model alert (usage_anomaly, device_anomaly). */
  feedback: z.enum(["useful", "not_anomaly"]).nullable().default(null),
})
export type Alert = z.infer<typeof AlertSchema>

export const VERDICTS = ["useful", "not_anomaly"] as const
export type Verdict = (typeof VERDICTS)[number]

const timestamp = z.iso
  .datetime({ offset: true })
  .transform((v) => Date.parse(v))

/** The figures an alert can watch when set by hand (a custom question goes through Wappi). */
export const WATCH_METRICS = [
  "bill_vnd",
  "bill_kwh",
  "forecast_vnd",
  "today_kwh",
  "power_w",
  "device_kwh_today",
  "device_on",
  "device_off",
  "device_run_min",
  "device_power_w",
] as const

/** GET /insights/watches: an alert the user set, by hand or through Wappi (decimals arrive as strings). */
export const WatchSchema = z.object({
  id: z.string(),
  label: z.string(),
  metric: z.string(),
  device_id: z.string().nullable(),
  op: z.enum(["gt", "lt"]),
  threshold: z.coerce.number(),
  unit: z.string(),
  status: z.enum(["active", "fired", "expired", "cancelled", "broken"]),
  /** Fires again each day, cycle or device run instead of once. */
  repeat: z.boolean(),
  last_value: z.coerce.number().nullable(),
  last_checked_at: timestamp.nullable(),
  fired_at: timestamp.nullable(),
  ends_at: timestamp,
  created_at: timestamp,
})
export type Watch = z.infer<typeof WatchSchema>

/** Still listed on the alerts page (and so linkable as `#watch-<id>`): active, or broken and needing a look. */
export const isWatched = (w: Pick<Watch, "status">) =>
  w.status === "active" || w.status === "broken"

/** POST /insights/watches. */
export const WatchCreateSchema = z.object({
  metric: z.enum(WATCH_METRICS),
  op: z.enum(["gt", "lt"]),
  threshold: z.number().finite(),
  label: z.string().trim().min(1).max(200),
  device_id: z.uuid().optional(),
  ends_on: z.iso.date().optional(),
  repeat: z.boolean(),
})
export type WatchCreate = z.infer<typeof WatchCreateSchema>

/** The unit each metric is stored in (the backend's UNITS). */
export const METRIC_UNIT: Record<(typeof WATCH_METRICS)[number], string> = {
  bill_vnd: "vnd",
  bill_kwh: "kwh",
  forecast_vnd: "vnd",
  today_kwh: "kwh",
  power_w: "w",
  device_kwh_today: "kwh",
  device_on: "",
  device_off: "",
  device_run_min: "min",
  device_power_w: "w",
}

/** How a unit is written after a figure: "₫", "kWh", "W", or Intl's own word for minutes. */
export function unitLabel(unit: string, locale: string): string {
  if (unit === "vnd") return "₫"
  if (unit === "min")
    return (
      new Intl.NumberFormat(locale, {
        style: "unit",
        unit: "minute",
        unitDisplay: "long",
      })
        .formatToParts(2)
        .find((p) => p.type === "unit")?.value ?? unit
    )
  return { kwh: "kWh", w: "W" }[unit] ?? unit
}

/** A figure with its unit as the dashboard writes it: "1.000.000 ₫", "3,2 kWh", "812 W". */
export function formatFigure(value: number, unit: string, locale: string) {
  if (unit === "vnd")
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "VND",
    }).format(value)
  if (unit === "min")
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "minute",
      unitDisplay: "long",
      maximumFractionDigits: 0,
    }).format(value) // "1 minute", "95 minutes", "95 phút"
  const n = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value)
  const suffix = unitLabel(unit, locale)
  return suffix ? `${n} ${suffix}` : n
}
