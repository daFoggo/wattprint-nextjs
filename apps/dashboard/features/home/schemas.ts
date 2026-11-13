import { z } from "zod"

/** "" or nothing is "not given". */
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    schema.nullable()
  )

/**
 * The home's settings: tb_home's own columns (name, kind, size, people, bill cycle day) and the dashboard's
 * preferences. Form values arrive as strings, so numbers are read from them.
 */
export const HomeSettingsSchema = z.object({
  name: z.string().trim().min(1).max(255),
  home_type: z.enum(["apartment", "house", "other"]),
  floor_area_m2: optionalNumber(z.number().positive().max(10_000)),
  occupants: optionalNumber(z.number().int().min(1).max(30)),
  billing_cycle_day: z.coerce.number().int().min(1).max(28),
  show_cost: z.boolean(),
  notify_anomaly: z.boolean(),
  notify_tier: z.boolean(),
  weekly_summary: z.boolean(),
})
export type HomeSettings = z.infer<typeof HomeSettingsSchema>
