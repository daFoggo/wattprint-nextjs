import "server-only"

import { cache } from "react"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

import {
  fetchBillHistory,
  fetchCurrentBill,
  fetchDeviceForecasts,
  fetchForecast,
} from "./server"

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
 * The ended cycles, oldest first, as the insight worker stored them (tb_bill). Null when there are none yet or the
 * account has no home.
 */
export const getBillHistory = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  const bills = await fetchBillHistory(accessToken).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return []
    throw error
  })
  return bills.length ? bills : null
})

/**
 * The running cycle's bill at its end (the backend's weekday-pattern forecast). Null without a home or a tariff, or
 * before the home has a week of full days to learn from.
 */
export const getForecast = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  return fetchForecast(accessToken).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  })
})

/**
 * Each device's next 7 days and the cycle's rest, with its range, reasons, certainty and advice. Null without a home or
 * a tariff, or before the home has a bill forecast.
 */
export const getDeviceForecasts = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  return fetchDeviceForecasts(accessToken).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  })
})
