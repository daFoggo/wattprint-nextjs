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

// tb_alert as the dashboard reads it; queries.ts still fills it from demo.ts.
export const AlertSchema = z.object({
  id: z.string(),
  /** What happened; the message and its figures come from `kind` and `payload`. */
  kind: z.enum(["longer_than_usual", "new_device", "repeated_cycle"]),
  severity: z.enum(["info", "warning", "critical"]),
  status: z.enum(["open", "acknowledged", "resolved"]),
  ts: z.number(),
  /** `type` is cat_device_type.code, for its icon. */
  device: z
    .object({ id: z.string(), name: z.string(), type: z.string() })
    .nullable(),
  payload: z.record(z.string(), z.number()),
})
export type Alert = z.infer<typeof AlertSchema>
