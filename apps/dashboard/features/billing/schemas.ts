import { z } from "zod"

import { DEVICE_ADVICE } from "@/config/advice"

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

/** What explains a device's week against its usual (backend expect.device.explain_outlook). */
export const DEVICE_FACTORS = [
  "temperature",
  "humidity",
  "sun",
  "rain",
  "calendar",
  "occupancy",
  "trend",
  "other",
] as const

const DeviceDaySchema = z.object({
  date: z.iso.date(),
  kwh: z.number().nullable(),
  kwh_p10: z.number().nullable(),
  kwh_p90: z.number().nullable(),
  amount: z.number().nullable(),
})

/**
 * GET /billing/devices/forecast: each device's next 7 days and the cycle's rest. `method` "model" is the device's own
 * model (it beat the weekday-hour mean when tried on past days), "weekday" that mean; `confidence` is the shown
 * method's error on those days; `explain` the 7 days ahead against the device's usual (its daily mean over the last
 * 28 days), the factors adding up to the change (none for the weekday mean); `advice` priced on the bill.
 */
export const DeviceForecastsSchema = z.object({
  period_end: z.iso.date(),
  as_of: z.iso.date(),
  devices: z.array(
    z.object({
      device_id: z.string(),
      name: z.string(),
      type: z.string(),
      simulated: z.boolean(),
      method: z.enum(["model", "weekday"]),
      confidence: z.enum(["high", "medium", "low"]),
      error_pct: z.number().nullable(),
      backtest_days: z.number(),
      next_days: z.array(DeviceDaySchema),
      kwh: z.number(),
      kwh_p10: z.number().nullable(),
      kwh_p90: z.number().nullable(),
      amount: z.number(),
      explain: z
        .object({
          usual_kwh_day: z.number(),
          forecast_kwh_day: z.number(),
          /** False: the model misses the device's own past, so it gives no factors. */
          explainable: z.boolean(),
          factors: z.array(
            z.object({
              key: z.enum(DEVICE_FACTORS),
              kwh_day: z.number(),
              amount: z.number(),
              now: z.number().nullable(),
              before: z.number().nullable(),
              /** Trend only: last week's °C when 1 °C+ unlike the 28 days', and theirs. */
              recent_temp: z.number().nullable(),
              usual_temp: z.number().nullable(),
            })
          ),
          busiest: DeviceDaySchema.nullable(),
        })
        .nullable(),
      advice: z.array(
        z.object({
          key: z.enum(DEVICE_ADVICE),
          saved_kwh: z.number(),
          saved_amount: z.number(),
          avoids_tier: z.number().nullable(),
          params: z.record(z.string(), z.number()),
        })
      ),
    })
  ),
})
export type DeviceForecasts = z.infer<typeof DeviceForecastsSchema>
export type DeviceForecast = DeviceForecasts["devices"][number]
