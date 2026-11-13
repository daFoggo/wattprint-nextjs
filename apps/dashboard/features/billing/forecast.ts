import type { CurrentBill } from "./schemas"

type Tier = Pick<
  CurrentBill["tiers"][number],
  "from_kwh" | "to_kwh" | "price_per_kwh"
>

const DAY = 86_400_000
// Bill dates are local days; Asia/Ho_Chi_Minh is UTC+7 all year.
const dayStart = (date: string) => Date.parse(`${date}T00:00:00+07:00`)

/** What a kWh has cost on average this cycle, VAT included (VND); undefined before the first kWh. */
export const averagePrice = (bill: CurrentBill) =>
  bill.kwh > 0 ? bill.amount_total / bill.kwh : undefined

/** What `kwh` in one cycle costs before VAT, priced tier by tier (VND, rounded). */
export function tieredAmount(kwh: number, tiers: Tier[]) {
  let amount = 0
  for (const tier of tiers) {
    const top = tier.to_kwh ?? Infinity
    const used = Math.min(kwh, top) - tier.from_kwh
    if (used > 0) amount += used * tier.price_per_kwh
  }
  return Math.round(amount)
}

/**
 * The cycle's bill if the rest of it goes at the pace so far: kWh, amount with VAT, the tier it ends in,
 * and when the next tier starts (null if not this cycle).
 * shortcut: a straight run rate from the cycle's kWh so far; replace with tb_forecast_snapshot (weather and
 * weekday aware) when the backend serves it.
 */
export function projectBill(bill: CurrentBill, now: number) {
  const start = dayStart(bill.period_start)
  const end = dayStart(bill.period_end) + DAY
  const elapsed = Math.max(now - start, DAY / 24) // an hour at least, so a fresh cycle has a pace
  const perMs = bill.kwh / elapsed
  const kwh = perMs * (end - start)
  const next = bill.tiers.find((x) => x.tier_no === bill.tier_no + 1)
  const reach =
    next && perMs > 0 ? now + (next.from_kwh - bill.kwh) / perMs : null
  const tier =
    [...bill.tiers].reverse().find((x) => kwh > x.from_kwh) ?? bill.tiers[0]!
  return {
    kwh,
    amount: Math.round(tieredAmount(kwh, bill.tiers) * (1 + bill.vat_rate)),
    days: Math.round((end - start) / DAY),
    tier: tier.tier_no,
    next:
      next && reach !== null && reach < end ? { tier: next, at: reach } : null,
  }
}
