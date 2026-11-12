import "server-only"

import { cacheLife } from "next/cache"

import { env } from "@/lib/env"

import type { Weather } from "./schemas"
import { fetchCurrent, fetchForecast } from "./server"

/** Weather at the configured place, shared by every user (it holds nothing private). Null without a key. */
export async function getWeather(): Promise<Weather | null> {
  "use cache"
  cacheLife({ stale: 300, revalidate: 600, expire: 3600 }) // OpenWeather updates about every 10 min
  const key = env.OPENWEATHER_API_KEY
  if (!key) return null
  const [now, forecast] = await Promise.all([
    fetchCurrent(key),
    fetchForecast(key),
  ])
  return { now, next: forecast.list.slice(0, 8) }
}
