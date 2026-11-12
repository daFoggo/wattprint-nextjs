import "server-only"

import { cache } from "react"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

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
