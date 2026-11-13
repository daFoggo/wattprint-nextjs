import "server-only"

import { getTranslations } from "next-intl/server"
import { io } from "next/cache"
import { cache } from "react"
import { z } from "zod"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

import { backgroundLoad, DAY, localDate, localMidnight } from "./days"
import {
  demoActivity,
  demoDevice,
  demoDevices,
  isDeviceKey,
  type DeviceKey,
  type Meter,
  type RoomKey,
} from "./demo"
import { ActivitySchema, DeviceDetailSchema, DeviceSchema } from "./schemas"
import { fetchOverview, fetchSeries } from "./server"

const isNoHome = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 404 &&
  (error.body as { code?: string } | undefined)?.code === "home_not_found"

/**
 * The newest reading and today so far, fresh on every request (docs/data-fetching.md §3: no directive,
 * inside <Suspense>), deduped per request by React.cache. Not "use cache: private": its session
 * check joined the page's own session read from inside the cache scope and hung until the
 * use-cache timeout.
 * Null when the account is not a member of any home yet (the backend's `home_not_found`).
 */
const getOverview = cache(async () => {
  const { accessToken } = await requirePermission("account:view")
  await io() // the session read above is cached: read the clock at request time
  const overview = await fetchOverview(accessToken).catch((error: unknown) => {
    if (isNoHome(error)) return null
    throw error
  })
  return overview && { ...overview, now: Date.now(), accessToken }
})

/** The newest reading's time, today against its usual, and per local day (90 days) the energy and the lowest draw. */
export const getDashboard = cache(async () => {
  const overview = await getOverview()
  if (!overview) return null
  const { now, accessToken } = overview
  const today = localMidnight(now)
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
  // The lowest draw each day: what the home uses with nothing switched on. A 0 is a gap in the readings.
  const baseline = daily
    .filter((p) => p.min_w > 0)
    .map((p) => ({ date: localDate(Date.parse(p.ts)), watts: p.min_w }))
  const first = daily[0] ? localMidnight(Date.parse(daily[0].ts)) : today
  const days = Array.from(
    { length: Math.round((today - first) / DAY) + 1 },
    (_, i) => localDate(first + i * DAY)
  ).map((date) => ({ date, value: kwh.get(date) ?? 0 }))
  return {
    latest: overview.live?.ts ?? null,
    live: overview.live?.watts ?? null,
    now,
    today: overview.today,
    days,
    baseline,
  }
})

const RANGES = { day: 1, week: 7, month: 30, quarter: 90 } as const
export type PowerRange = keyof typeof RANGES

/**
 * The main meter's average draw over the last day, week, 30 or 90 days: 15-minute, hourly,
 * 6-hourly and daily steps (as Sense's meter). All four at once, so switching is instant.
 */
export const getPower = cache(async () => {
  const overview = await getOverview()
  if (!overview) return null
  const { now, accessToken } = overview
  const points = { day: 96, week: 168, month: 120, quarter: 90 }
  const entries = await Promise.all(
    (Object.keys(RANGES) as PowerRange[]).map(async (range) => {
      const series = await fetchSeries(
        accessToken,
        new Date(now - RANGES[range] * DAY),
        new Date(now),
        points[range]
      )
      return [
        range,
        series.map((p) => ({ ts: Date.parse(p.ts), watts: p.avg_w })),
      ] as const
    })
  )
  return {
    now,
    ranges: Object.fromEntries(entries) as Record<
      PowerRange,
      { ts: number; watts: number }[]
    >,
  }
})

// shortcut: the device reads below come from demo.ts until the NILM endpoints exist; they already
// return the API's shape (schemas.ts), so only these functions change when it lands.

/** VND per kWh with VAT, for a home without a tariff (about the 2025 tariff's average). */
const PRICE = 2_700

/** The real meter the sample hangs off (see `Meter`). Null without a home. */
const getMeter = cache(async () => {
  const data = await getDashboard()
  if (!data) return null
  const meter: Meter = {
    kwh: new Map(data.days.map((d) => [d.date, d.value])),
    baseline: backgroundLoad(data.baseline, data.now) ?? 0,
    live: data.live,
  }
  return { now: data.now, meter }
})

async function names() {
  const t = await getTranslations("energy.demo")
  return {
    device: (key: DeviceKey) => t(`devices.${key}`),
    room: (key: RoomKey | null) => (key ? t(`rooms.${key}`) : null),
    tip: (key: DeviceKey) => t(`tips.${key}`),
  }
}

/**
 * Every device in the home with its state now. With `bill` (this cycle's amount so far, VND) each device gets its
 * share of it by kWh, as the backend will split the real bill, so the devices add up to the bill on the page; without
 * it they are priced at an average rate. Null without a home.
 */
export const getDevices = cache(async (bill?: number) => {
  const real = await getMeter()
  if (!real) return null
  const name = await names()
  const rows = demoDevices(real.now, real.meter)
  const total = rows.reduce((s, d) => s + d.month_kwh, 0)
  const price = bill !== undefined && total > 0 ? bill / total : PRICE
  return z.array(DeviceSchema).parse(
    rows.map(({ key, ...d }) => ({
      ...d,
      id: key,
      name: name.device(key),
      room: name.room(d.room),
      month_amount: d.month_kwh * price,
    }))
  )
})

/** One device's page, priced like `getDevices`; null when the home has no such device (or there is no home). */
export const getDevice = cache(async (id: string, bill?: number) => {
  const real = await getMeter()
  if (!real || !isDeviceKey(id)) return null
  const name = await names()
  const { key, year_kwh, ...d } = demoDevice(id, real.now, real.meter)
  const total = demoDevices(real.now, real.meter).reduce(
    (s, r) => s + r.month_kwh,
    0
  )
  const price = bill !== undefined && total > 0 ? bill / total : PRICE
  return DeviceDetailSchema.parse({
    ...d,
    id: key,
    name: name.device(key),
    room: name.room(d.room),
    tip: name.tip(key),
    month_amount: d.month_kwh * price,
    year_amount: year_kwh * price,
  })
})

/** The last 24 hours' runs of the devices shown on the timeline, oldest first. */
export const getActivity = cache(async () => {
  const real = await getMeter()
  if (!real) return null
  const name = await names()
  return z.array(ActivitySchema).parse(
    demoActivity(real.now, real.meter).map(({ key, ...run }) => ({
      ...run,
      device: key,
      name: name.device(key),
      room: name.room(run.room),
    }))
  )
})
