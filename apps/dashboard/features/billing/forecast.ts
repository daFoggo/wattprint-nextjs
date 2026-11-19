import type { CurrentBill } from "./schemas"

/** What a kWh has cost on average this cycle, VAT included (VND); undefined before the first kWh. */
export const averagePrice = (bill: CurrentBill) =>
  bill.kwh > 0 ? bill.amount_total / bill.kwh : undefined
