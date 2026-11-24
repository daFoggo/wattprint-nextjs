import { z } from "zod"

/** "" or nothing is "not given". */
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    schema.nullable()
  )

export const HOME_TYPES = ["apartment", "house", "other"] as const

/** GET /homes/current: the home's own columns and this account's role in it. */
export const HomeSchema = z.object({
  id: z.string(),
  name: z.string(),
  home_type: z.enum(HOME_TYPES).nullable(),
  // Decimal columns arrive as strings ("72.50").
  floor_area_m2: optionalNumber(z.number()),
  occupants: z.number().int().nullable(),
  billing_cycle_day: z.number().int(),
  province_code: z.string().nullable(),
  role: z.enum(["owner", "member", "viewer"]),
})
export type Home = z.infer<typeof HomeSchema>

/** GET /users/me/preferences: what this account is told about. */
export const PreferencesSchema = z.object({
  notify_anomaly: z.boolean(),
  notify_tier: z.boolean(),
  weekly_summary: z.boolean(),
})
export type Preferences = z.infer<typeof PreferencesSchema>

export const ProvinceSchema = z.object({ code: z.string(), name: z.string() })
export type Province = z.infer<typeof ProvinceSchema>

/** A change to the home (owner only). Form values arrive as strings, so numbers are read from them. */
export const HomePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    home_type: z.preprocess(
      (v) => (v === "" ? null : v),
      z.enum(HOME_TYPES).nullable()
    ),
    floor_area_m2: optionalNumber(z.number().positive().max(10_000)),
    occupants: optionalNumber(z.number().int().min(1).max(30)),
    billing_cycle_day: z.coerce.number().int().min(1).max(28),
    province_code: z.string().max(16).nullable(),
  })
  .partial()
  .strict()

export const PreferencesPatchSchema = PreferencesSchema.partial().strict()

/** What saving settings answers: a refusal carries the reason to show. */
export type SaveResult = { ok: true } | { ok: false; error: string }
