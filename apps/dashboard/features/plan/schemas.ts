import { z } from "zod"

import { DEVICE_ADVICE } from "@/config/advice"

export const PLAN_KEYS = [...DEVICE_ADVICE, "always_on"] as const

const amount = z.number().finite().nonnegative()

/** One action as the page priced it (a device's advice, or the always-on cut with `device_id` null). */
const ActionSchema = z.object({
  device_id: z.uuid().nullable(),
  key: z.enum(PLAN_KEYS),
  label: z.string().trim().min(1).max(200),
  kwh: amount,
  amount,
  /** The device's usual kWh a day at the start (its baseline), or the background load (W) for always-on. */
  baseline: amount.nullable(),
  watts: amount.nullable(),
})
export type PlanAction = z.infer<typeof ActionSchema>

/** POST /insights/plans: what the page sends; the backend derives the cycle, model, σ and bias. */
export const PlanCreateSchema = z.object({
  start_on: z.iso.date(),
  actions: z.array(ActionSchema).min(1).max(3),
})
export type PlanCreate = z.infer<typeof PlanCreateSchema>

/**
 * GET /insights/plans/current: the running plan. `days` are frozen by the backend against `model_version` (a refit
 * cannot learn the saving away), `expected` already carries the model's mean error `bias`; `sigma` is its
 * out-of-sample daily spread (null when too few days).
 */
export const PlanSchema = z.object({
  id: z.uuid(),
  start_on: z.iso.date(),
  end_on: z.iso.date(),
  model_version: z.string(),
  sigma: z.number().nullable(),
  bias: z.number(),
  forecast_kwh: z.number(),
  actions: z.array(ActionSchema),
  days: z.array(
    z.object({
      date: z.iso.date(),
      expected: z.number(),
      actual: z.number(),
      /** The planned devices with a trusted model, by id: their own expectation, weather included. */
      devices: z.record(
        z.string(),
        z.object({ expected: z.number(), actual: z.number() })
      ),
    })
  ),
  status: z.enum(["active", "stopped"]),
})
export type Plan = z.infer<typeof PlanSchema>

/** GET /insights/plans/history: finished plans, newest first; `mine` false for a home owner's plan (a demo home's). */
export const PlanRecordSchema = PlanSchema.extend({
  stopped_at: z.iso.datetime({ offset: true }).nullable(),
  mine: z.boolean(),
})
export const PlanHistorySchema = z.array(PlanRecordSchema)
export type PlanHistoryItem = z.infer<typeof PlanRecordSchema>

/** GET /insights/plans/basis: what a plan started now is measured against (the backend's single source). */
export const PlanBasisSchema = z.object({
  model_version: z.string(),
  sigma: z.number().nullable(),
  bias: z.number(),
  earliest_start: z.iso.date(),
  period_end: z.iso.date(),
})
export type PlanBasis = z.infer<typeof PlanBasisSchema>
