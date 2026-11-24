import type messages from "@/messages/vi/plan.json"

import type { Tier } from "../math"
import type { PlanAction } from "../schemas"

/** An action with a commitment sentence: the device advice keys and `always_on`. */
export type CommitKey = keyof (typeof messages)["commit"]

/** One device advice the backend priced (`GET /billing/devices/forecast`), ready to pick. */
export type Opportunity = {
  /** `<deviceId>.<key>` */
  id: string
  deviceId: string
  key: PlanAction["key"]
  device: string
  /** cat_device_type.code, for its icon. */
  type: string
  /** The advice in the page's language, with its numbers. */
  label: string
  simulated: boolean
  kwh: number
  amount: number
  avoidsTier: number | null
  range: { low: number; high: number } | null
  /** The device's usual kWh a day (last 28 days); frozen as the plan's baseline. */
  baseline: number | null
}

/** Everything the plan page reads, composed on the server from billing and energy (plain data). */
export type PlanData = {
  today: string
  periodEnd: string
  /** Days from today to the cycle's end, both counted (the backend's horizon for advice). */
  daysLeft: number
  /** The earliest start day the backend allows (the cycle's start or the model's training day). */
  minStart: string
  forecastKwh: number
  /** This cycle's kWh so far. */
  billKwh: number
  tiers: Tier[]
  vat: number
  /** The home model in force now (`ctx-v3-…`, "none"), from the backend. */
  model: string
  /** The home model's out-of-sample daily error spread (kWh), from the backend; null under 14 days. */
  sigma: number | null
  /** The background load now (W), the median of the last 7 days' lowest draw. */
  alwaysOnW: number | null
  advice: Opportunity[]
  /** Each advised device's days (this month and at least the last 30), today last (kWh). */
  deviceDays: Record<string, { date: string; kwh: number }[]>
  /** Each advised or planned device's type code, for its icon. */
  deviceTypes: Record<string, string>
}

export function formats(locale: string) {
  return {
    vnd: new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }),
    kwh: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    kwhDay: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    watts: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    date: new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }),
    // A past plan's end carries its year: the history spans cycles of several years.
    dateYear: new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  }
}

export const at = (iso: string) => new Date(`${iso}T00:00:00+07:00`)
