import { z } from "zod"

// Shapes of tb_cohort_stat and tb_alert as the dashboard reads them. No endpoint serves them yet: queries.ts
// fills them from demo.ts and will parse the API's response with the same schemas.

/** Similar homes over the last `days` days: how many, and their energy at the 10th…90th percentile (kWh). */
export const CohortSchema = z.object({
  homes: z.number(),
  days: z.number(),
  p10: z.number(),
  p33: z.number(),
  p66: z.number(),
  p90: z.number(),
})
export type Cohort = z.infer<typeof CohortSchema>

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
