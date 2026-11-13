import "server-only"

import { cache } from "react"

import { requirePermission } from "@/lib/dal"

import { DEMO_SETTINGS } from "./demo"
import { HomeSettingsSchema } from "./schemas"

/** The home's settings. shortcut: from demo.ts until the backend serves them; parsed with the API's schema already. */
export const getHomeSettings = cache(async () => {
  await requirePermission("account:view")
  return HomeSettingsSchema.parse(DEMO_SETTINGS)
})
