import "server-only"

import { io } from "next/cache"
import { cache } from "react"
import { z } from "zod"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

import { demoMonths } from "./demo"
import { projectBill, tieredAmount } from "./forecast"
import { PastBillSchema } from "./schemas"
import { fetchCurrentBill } from "./server"

/**
 * The running billing cycle, priced by the tariff tiers on the backend; fresh on every request,
 * deduped per request. Null without a home or a tariff (the backend's 404s).
 */
export const getCurrentBill = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  return fetchCurrentBill(accessToken).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  })
})

/**
 * Past cycles from January last year, each priced with the home's current tariff and VAT. Null without a
 * tariff (nothing to price with). shortcut: the kWh come from demo.ts, scaled to this cycle's forecast,
 * until the backend serves tb_bill.
 */
export const getBillHistory = cache(async () => {
  const bill = await getCurrentBill()
  if (!bill) return null
  await io() // the scale comes from the pace so far
  const level = projectBill(bill, Date.now()).kwh
  return z.array(PastBillSchema).parse(
    demoMonths(bill.period_start.slice(0, 7), level).map((m) => ({
      ...m,
      amount: Math.round(tieredAmount(m.kwh, bill.tiers) * (1 + bill.vat_rate)),
    }))
  )
})
