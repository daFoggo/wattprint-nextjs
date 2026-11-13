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

/** One past cycle (tb_bill): its month, kWh and amount with VAT. */
export const PastBillSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  kwh: z.number(),
  amount: z.number(),
})
export type PastBill = z.infer<typeof PastBillSchema>
