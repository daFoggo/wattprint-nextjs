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
 * GET /billing/forecast: the running cycle at its end. `method` "context": the home's expected-usage model (weather,
 * calendar, routine), `kwh`/`amount` its middle and `*_p10`…`*_p90` its range; "weekday": the usual weekday pattern
 * of the last 4 weeks, a point (p10 = p90). `next.at` is the day it passes into the next, dearer tier (local midnight in
 * ms) and `next.probability` how likely that is (context only); `change` why it moved since yesterday (VND parts).
 */
export const ForecastSchema = z
  .object({
    period_start: z.iso.date(),
    period_end: z.iso.date(),
    kwh: z.number(),
    amount: z.number(),
    tier_no: z.number(),
    next: z
      .object({
        tier_no: z.number(),
        from_kwh: z.number(),
        price_per_kwh: z.number(),
        on: z.iso.date(),
        probability: z.number().nullable().default(null),
      })
      .nullable(),
    basis_days: z.number(),
    /** The local day it was made on. */
    as_of: z.iso.date(),
    method: z.enum(["context", "weekday"]),
    model_version: z.string(),
    kwh_p10: z.number(),
    kwh_p50: z.number(),
    kwh_p90: z.number(),
    amount_p10: z.number(),
    amount_p90: z.number(),
    change: z
      .object({ amount: z.number(), parts: z.record(z.string(), z.number()) })
      .nullable(),
    accuracy: z
      .object({
        source: z.enum(["cycle", "backtest"]),
        error_pct: z.number(),
        cycles: z.number(),
      })
      .nullable(),
    /** Simulated loads running in this demo home (heater, demo scenarios). */
    simulated: z.array(z.string()),
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
