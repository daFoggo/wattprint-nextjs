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

/** The reasons a forecast may name (backend factor groups, plus what was used and the rest). */
export const CHANGE_PARTS = [
  "used",
  "weather",
  "calendar",
  "occupancy",
  "trend",
  "unexplained",
] as const
export type ChangePart = (typeof CHANGE_PARTS)[number]

const CHANGE_MIN_VND = 10_000
const CHANGE_MIN_SHARE = 0.02

/**
 * Why the forecast moved since yesterday, biggest reason first; null when the move is under 2 % and 10.000 ₫ (the
 * backend's own bar) or there is nothing to explain.
 */
export function changeSentence(
  f: Forecast
): { amount: number; top: ChangePart; parts: [ChangePart, number][] } | null {
  if (!f.change) return null
  const bar = Math.min(CHANGE_MIN_VND, CHANGE_MIN_SHARE * f.amount)
  if (Math.abs(f.change.amount) < bar) return null
  const parts = Object.entries(f.change.parts)
    .filter(
      (e): e is [ChangePart, number] =>
        (CHANGE_PARTS as readonly string[]).includes(e[0]) &&
        Math.round(e[1]) !== 0
    )
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  if (!parts.length) return null
  return { amount: f.change.amount, top: parts[0]![0], parts }
}
