import "server-only"

import { cache } from "react"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

import type { Weather } from "./schemas"
import { fetchWeather } from "./server"

const code = (error: unknown) =>
  error instanceof ApiError && error.status === 404
    ? (error.body as { code?: string } | undefined)?.code
    : undefined

/**
 * The weather at the home's province in `lang` (the backend caches it 10 minutes per place).
 * "unset" when the home has no province yet, null without a home; a weather outage throws.
 */
export const getWeather = cache(
  async (lang: string): Promise<Weather | "unset" | null> => {
    const { accessToken } = await requirePermission("account:view")
    try {
      return await fetchWeather(accessToken, lang === "en" ? "en" : "vi")
    } catch (error) {
      if (code(error) === "home_location_unset") return "unset"
      if (code(error) === "home_not_found") return null
      throw error
    }
  }
)
