import { z } from "zod"

// Only the fields the dashboard reads; Zod drops the rest of each backend response.
const Instant = z.iso.datetime({ offset: true })

export const PowerSchema = z.object({ ts: Instant, watts: z.number() })

export const OverviewSchema = z.object({
  live: PowerSchema.nullable(),
  /** Today so far, and the same weekday's usual by now (null without enough history). */
  today: z
    .object({ kwh: z.number(), typical_kwh: z.number().nullable() })
    .nullable(),
})

export const SeriesPointSchema = z.object({
  ts: Instant,
  avg_w: z.number(),
  min_w: z.number(),
  energy_wh: z.number(),
})

// Devices are what NILM finds (tb_device + cat_device_type), their cycles tb_device_cycle.
// No endpoint serves them yet: queries.ts fills these shapes from demo.ts, and parses the API
// response with the same schemas once it exists.

/** One on/off run of a device; `end` is null while it is still running. */
export const CycleSchema = z.object({
  start: z.number(),
  end: z.number().nullable(),
  kwh: z.number(),
})

export const DeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  room: z.string().nullable(),
  /** cat_device_type.code; picks the icon. */
  type: z.string(),
  on: z.boolean(),
  watts: z.number(),
  today_kwh: z.number(),
  month_kwh: z.number(),
  /** Its share of the home's bill so far this month (VND, VAT included). */
  month_amount: z.number(),
  /** The last 7 days, oldest first, today last (kWh). */
  week_kwh: z.array(z.number()),
})
export type Device = z.infer<typeof DeviceSchema>

export const DeviceDetailSchema = DeviceSchema.extend({
  /** cat_device_type.typical_watts and tip_text. */
  typical_w: z.number().nullable(),
  tip: z.string().nullable(),
  /** Average draw while on, and the highest, this month. */
  avg_on_w: z.number(),
  peak_w: z.number(),
  /** Its share of the home's kWh this month, 0..1. */
  home_share: z.number(),
  /** This month's pace over a whole year (VND). */
  year_amount: z.number(),
  /** Each day of the month so far, today last. */
  days: z.array(z.object({ date: z.iso.date(), kwh: z.number() })),
  /** The last 24 hours in 5-minute steps: step start (ms) and average draw. */
  power: z.array(z.object({ ts: z.number(), watts: z.number() })),
  /** Runs started in the last 24 hours, oldest first. */
  cycles: z.array(CycleSchema),
})
export type DeviceDetail = z.infer<typeof DeviceDetailSchema>

/** A run in the home's activity: which device, and the run. */
export const ActivitySchema = CycleSchema.extend({
  device: z.string(),
  name: z.string(),
  room: z.string().nullable(),
})
export type Activity = z.infer<typeof ActivitySchema>
