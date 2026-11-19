import { z } from "zod"

// Only the fields the bill card reads; Zod drops the rest of the backend response.
const TierSchema = z.object({
  tier_no: z.number(),
  from_kwh: z.number(),
  to_kwh: z.number().nullable(),
  price_per_kwh: z.number(),
  kwh: z.number(),
  amount: z.number(),
})

export const CurrentBillSchema = z.object({
  period_start: z.iso.date(),
  period_end: z.iso.date(),
  status: z.enum(["open", "partial", "closed"]),
  tariff_straddle: z.boolean(),
  vat_rate: z.number(),
  kwh: z.number(),
  amount_before_vat: z.number(),
  vat_amount: z.number(),
  amount_total: z.number(),
  tier_no: z.number(),
  tiers: z.array(TierSchema),
  today_kwh: z.number(),
  today_amount: z.number(),
})

export type CurrentBill = z.infer<typeof CurrentBillSchema>

/** GET /billing/history: one ended cycle (tb_bill), its kWh and amount with VAT; `month` is the month it starts in. */
export const PastBillSchema = z
  .object({
    period_start: z.iso.date(),
    period_end: z.iso.date(),
    kwh: z.number(),
    amount: z.number(),
    // Share of the cycle the meter reported; under 0.95 readings are missing.
    coverage: z.number(),
    tariff_straddle: z.boolean(),
  })
  .transform((b) => ({ ...b, month: b.period_start.slice(0, 7) }))
export type PastBill = z.infer<typeof PastBillSchema>

/** Below this the bill misses readings (the backend's `partial`). */
export const FULL_COVERAGE = 0.95

/**
 * GET /billing/forecast: the running cycle at its end if the home keeps its usual weekday pattern (last 4 weeks), and
 * the day it passes into the next, dearer tier (`at`, local midnight in ms) if it does this cycle.
 */
export const ForecastSchema = z
  .object({
    kwh: z.number(),
    amount: z.number(),
    tier_no: z.number(),
    next: z
      .object({
        tier_no: z.number(),
        from_kwh: z.number(),
        price_per_kwh: z.number(),
        on: z.iso.date(),
      })
      .nullable(),
    basis_days: z.number(),
  })
  .transform(({ next, tier_no, ...f }) => ({
    ...f,
    tier: tier_no,
    next: next && {
      tier: next,
      at: Date.parse(`${next.on}T00:00:00+07:00`),
    },
  }))
export type Forecast = z.infer<typeof ForecastSchema>
