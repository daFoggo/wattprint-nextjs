import "server-only"

import { cacheLife } from "next/cache"
import { cache } from "react"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

import { fetchHome, fetchPreferences, fetchProvinces } from "./server"

const isNoHome = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 404 &&
  (error.body as { code?: string } | undefined)?.code === "home_not_found"

/** The home and this account's choices, fresh per request. Null when the account has no home. */
export const getHomeSettings = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  const [home, preferences] = await Promise.all([
    fetchHome(accessToken).catch((error: unknown) => {
      if (isNoHome(error)) return null
      throw error
    }),
    fetchPreferences(accessToken),
  ])
  return home && { home, preferences }
})

/** The 34 province-level units: reference data, the same for everyone. */
export async function getProvinces() {
  "use cache"
  cacheLife("days")
  return fetchProvinces()
}
