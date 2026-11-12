import "server-only"

import { io } from "next/cache"
import { cache } from "react"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

import { fetchOverview, fetchSeries } from "./server"

const HOUR = 3_600_000
const DAY = 24 * HOUR
// Asia/Ho_Chi_Minh has no DST: the backend cuts its days at the same instant (17:00 UTC).
const ICT = 7 * HOUR

const localMidnight = (ms: number) => Math.floor((ms + ICT) / DAY) * DAY - ICT
const localDate = (ms: number) => new Date(ms + ICT).toISOString().slice(0, 10)
const isNoHome = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 404 &&
  (error.body as { code?: string } | undefined)?.code === "home_not_found"

/**
 * The Overview's data: the newest reading's time and energy per local day, fresh on every request (docs/data-fetching.md §3: no directive,
 * inside <Suspense>), deduped per request by React.cache. Not "use cache: private": its session
 * check joined the page's own session read from inside the cache scope and hung until the
 * use-cache timeout.
 * Null when the account is not a member of any home yet (the backend's `home_not_found`).
 */
export const getDashboard = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  await io() // the session read above is cached: read the clock at request time
  const now = Date.now()
  const today = localMidnight(now)
  const overview = await fetchOverview(accessToken).catch((error: unknown) => {
    if (isNoHome(error)) return null
    throw error
  })
  if (!overview) return null
  // 90 days is the backend's longest window; 1 point per day.
  const daily = await fetchSeries(
    accessToken,
    new Date(today - 89 * DAY),
    new Date(now),
    90
  )
  // The backend leaves out days without readings. Gaps after the first reading are days at
  // 0 kWh; days before it are not part of this home's history (a new home has only a few).
  const kwh = new Map(
    daily.map((p) => [localDate(Date.parse(p.ts)), p.energy_wh / 1000])
  )
  const first = daily[0] ? localMidnight(Date.parse(daily[0].ts)) : today
  const days = Array.from(
    { length: Math.round((today - first) / DAY) + 1 },
    (_, i) => localDate(first + i * DAY)
  ).map((date) => ({ date, value: kwh.get(date) ?? 0 }))
  // Only what the page reads: when the newest reading was taken, if any.
  return { latest: overview.live?.ts ?? null, days }
})
