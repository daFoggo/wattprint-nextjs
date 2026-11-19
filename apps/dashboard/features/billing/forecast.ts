import type { Confidence } from "@/components/shared/model-badge"

import type { CurrentBill, Forecast } from "./schemas"

/** What a kWh has cost on average this cycle, VAT included (VND); undefined before the first kWh. */
export const averagePrice = (bill: CurrentBill) =>
  bill.kwh > 0 ? bill.amount_total / bill.kwh : undefined

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000

/** Share of the cycle behind the day the forecast was made (0 to 1). */
export const cyclePassed = (f: Forecast) =>
  (day(f.as_of) - day(f.period_start)) /
  (day(f.period_end) - day(f.period_start) + 1)

/** A forecast is as good as the days it learnt from and the part of the cycle still to guess. */
export function forecastConfidence(f: Forecast): Confidence {
  const passed = cyclePassed(f)
  if (f.basis_days < 14 || passed < 0.2) return "low"
  return f.basis_days >= 21 && passed >= 0.5 ? "high" : "medium"
}
