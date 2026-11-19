import "server-only"

import { getTranslations } from "next-intl/server"
import { io } from "next/cache"
import { cache } from "react"
import { z } from "zod"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

import { demoAlerts } from "./demo"
import { AlertSchema } from "./schemas"
import { fetchCohort } from "./server"

// shortcut: the alerts come from demo.ts until the backend serves them; they already have the API's shape.

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

/** The home's alerts, newest first. */
export const getAlerts = cache(async () => {
  await requirePermission("account:view")
  await io() // the sample is timed back from now
  // The sample's device names are the energy sample's.
  const t = await getTranslations("energy.demo.devices")
  return z.array(AlertSchema).parse(
    demoAlerts(Date.now()).map((a) => ({
      ...a,
      device: a.device
        ? {
            ...a.device,
            name: t(a.device.id as "fridge" | "washer"),
          }
        : null,
    }))
  )
})
