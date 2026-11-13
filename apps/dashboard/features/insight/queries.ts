import "server-only"

import { getTranslations } from "next-intl/server"
import { io } from "next/cache"
import { cache } from "react"
import { z } from "zod"

import { requirePermission } from "@/lib/dal"

import { demoAlerts, demoCohort } from "./demo"
import { AlertSchema, CohortSchema } from "./schemas"

// shortcut: both reads come from demo.ts until the backend serves the cohort and the alerts; they already
// return the API's shape (schemas.ts), so only these functions change.

/** Similar homes over the last 30 days. */
export const getCohort = cache(async () => {
  await requirePermission("account:view")
  return CohortSchema.parse(demoCohort(30))
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
