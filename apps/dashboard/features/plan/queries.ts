import "server-only"

import { cache } from "react"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

import { fetchBasis, fetchHistory, fetchPlan, fetchPlanById } from "./server"

/** The user's running savings plan for the home, fresh per request; null when there is none. */
export const getPlan = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  return fetchPlan(accessToken).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  })
})

/** What a plan started now is measured against; null without a tariff (404) or a forecast yet (422). */
export const getPlanBasis = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  return fetchBasis(accessToken).catch((error: unknown) => {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 422)
    )
      return null
    throw error
  })
})

/** The home's finished plans (the user's, and the owners' on a demo home), fresh per request; null without a home. */
export const getPlanHistory = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  return fetchHistory(accessToken).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  })
})

/** One plan the user may open (theirs, or a home owner's), fresh per request; null when it is not theirs to open. */
export const getPlanById = cache(async (id: string) => {
  const { accessToken } = await requirePermission("account:view")
  return fetchPlanById(accessToken, id).catch((error: unknown) => {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 422)
    )
      return null
    throw error
  })
})
