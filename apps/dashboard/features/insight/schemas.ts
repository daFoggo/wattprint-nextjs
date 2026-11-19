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
  ]),
  severity: z.enum(["info", "warning", "critical"]),
  /** acknowledged: seen, off the Overview; resolved: the detector found the cause gone. */
  status: z.enum(["open", "acknowledged", "resolved"]),
  ts: z.iso.datetime({ offset: true }).transform((v) => Date.parse(v)),
  /** `type` is cat_device_type.code, for its icon. */
  device: z
    .object({ id: z.string(), name: z.string(), type: z.string() })
    .nullable(),
  payload: z.record(z.string(), z.number()),
})
export type Alert = z.infer<typeof AlertSchema>
