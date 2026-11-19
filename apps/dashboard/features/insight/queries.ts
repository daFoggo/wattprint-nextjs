import "server-only"

import { cache } from "react"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

import { fetchAlerts, fetchCohort } from "./server"

/**
 * This home against similar homes over the last 30 whole days. Null while fewer than 10 homes can be compared
 * (the backend's 404) or this home's meter missed too much of the window to compare fairly.
 */
export const getCohort = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  const cohort = await fetchCohort(accessToken).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  })
  return cohort?.kwh == null ? null : { ...cohort, kwh: cohort.kwh }
})

/** The home's latest alerts, unresolved first, then newest first; null without a home (the backend's 404). */
export const getAlerts = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  return fetchAlerts(accessToken).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  })
})
