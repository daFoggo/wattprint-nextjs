import "server-only"

import { getTranslations } from "next-intl/server"
import { io } from "next/cache"
import { cache } from "react"
import { z } from "zod"

import { requirePermission } from "@/lib/dal"
import { ApiError } from "@/lib/errors"

import type messages from "@/messages/vi/energy.json"

import { DAY, dateStart, localDate, localMidnight } from "./days"
import { todaySoFar, usualWatts } from "./expected"
import {
  fetchActivity,
  fetchDevice,
  fetchDevices,
  fetchExpected,
  fetchOverview,
  fetchSeries,
} from "./server"

const isNoHome = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 404 &&
  (error.body as { code?: string } | undefined)?.code === "home_not_found"

/** The owner lets this account see days only (R4.3): the finer routes refuse, and the pages leave their blocks out. */
const isByDay = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 403 &&
  (error.body as { code?: string } | undefined)?.code === "detail_restricted"

/** Null instead of the refusal; any other failure still throws. */
const unlessByDay = <T>(read: Promise<T>) =>
  read.catch((error: unknown) => {
    if (isByDay(error)) return null
    throw error
  })

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
  const series = await unlessByDay(
    fetchSeries(accessToken, new Date(today - 89 * DAY), new Date(now), 90)
  )
  const daily = series ?? []
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
  // By day only there is no series: today's total is all there is, not a history of zeros.
  if (!series) kwh.set(localDate(today), overview.today?.kwh ?? 0)
  const days = Array.from(
    { length: Math.round((today - first) / DAY) + 1 },
    (_, i) => localDate(first + i * DAY)
  ).map((date) => ({ date, value: kwh.get(date) ?? 0 }))
  return {
    byDay: !series,
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
  const reads = Promise.all(
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
  const entries = await unlessByDay(reads)
  if (!entries) return null
  const ranges = Object.fromEntries(entries) as Record<
    PowerRange,
    { ts: number; watts: number }[]
  >
  // The model's usual for the day range (hourly P50 under each 15-minute step); none without a model.
  const hours = await fetchExpected(
    accessToken,
    new Date(now - DAY - 3_600_000),
    new Date(now + 3_600_000)
  )
  const day = usualWatts(
    ranges.day.map((p) => p.ts),
    hours
  )
  return { now, ranges, usual: day ? { day } : {} }
})

/** Today's measured kWh against what the home's model expected for those hours; null without a model or a home. */
export const getTodayUsual = cache(async () => {
  const overview = await getOverview()
  if (!overview) return null
  const { now, accessToken } = overview
  const hours = await unlessByDay(
    fetchExpected(accessToken, new Date(localMidnight(now)), new Date(now))
  )
  return hours && todaySoFar(hours, now)
})

/** VND per kWh with VAT, for a home without a tariff (about the 2025 tariff's average). */
const PRICE = 2_700

type DeviceKey = keyof (typeof messages)["tips"]

/** cat_device_type code -> its tip in the messages (energy.tips.*). */
const TYPE_KEYS: Partial<Record<string, DeviceKey>> = {
  always_on: "alwaysOn",
  fridge_freezer: "fridge",
  fridge: "fridge",
  freezer: "fridge",
  kettle: "kettle",
  washing_machine: "washer",
  television: "tv",
  hifi: "hifi",
  dishwasher: "dishwasher",
  microwave: "microwave",
  toaster: "toaster",
  ac: "ac",
  water_heater: "waterHeater",
  rice_cooker: "riceCooker",
  other: "other",
}

/** A device's tip in the page's language; the backend's English text for types without one. */
const tips = cache(async () => {
  const t = await getTranslations("energy.tips")
  return (d: { type: string; tip: string | null }) => {
    const key = TYPE_KEYS[d.type]
    return key ? t(key) : d.tip
  }
})

/** VND per kWh of this month: the bill so far split by the devices' kWh, else the average rate. */
function pricePerKwh(devices: { month_kwh: number }[], bill?: number) {
  const total = devices.reduce((s, d) => s + d.month_kwh, 0)
  return bill !== undefined && total > 0 ? bill / total : PRICE
}

/**
 * Every device in the home with its state now. With `bill` (this cycle's amount so far, VND) each device gets its
 * share of it by kWh, so the devices add up to the bill on the page; without it they are priced at an average rate.
 * Null without a home.
 */
export const getDevices = cache(async (bill?: number) => {
  const overview = await getOverview()
  if (!overview) return null
  const rows = await fetchDevices(overview.accessToken)
  const price = pricePerKwh(rows, bill)
  return rows.map((d) => ({
    ...d,
    watts: d.watts === null ? null : Math.round(d.watts), // NILM estimates carry decimals no one reads
    // The sparkline's screen-reader summary prints raw values, ignoring its `format`.
    week_kwh: d.week_kwh.map((v) => Math.round(v * 100) / 100),
    month_amount: d.month_kwh * price,
  }))
})

/** One device's page, priced like `getDevices`; null when the home has no such device (or there is no home). */
export const getDevice = cache(async (id: string, bill?: number) => {
  const overview = await getOverview()
  if (!overview || !z.uuid().safeParse(id).success) return null
  const [d, all, tip] = await Promise.all([
    fetchDevice(overview.accessToken, id),
    getDevices(bill), // the same read as the list's, once per request
    tips(),
  ])
  if (!d) return null
  const price = pricePerKwh(all ?? [], bill)
  const today = localDate(overview.now)
  const elapsed = (overview.now - dateStart(`${today.slice(0, 8)}01`)) / DAY
  return {
    ...d,
    tip: tip(d),
    watts: d.watts === null ? null : Math.round(d.watts),
    avg_on_w: Math.round(d.avg_on_w),
    peak_w: Math.round(d.peak_w),
    month_amount: d.month_kwh * price,
    // This month's pace over a whole year.
    year_amount: elapsed > 0 ? (d.month_kwh / elapsed) * 365 * price : 0,
  }
})

/** The last 24 hours' runs of the devices shown on the timeline, oldest first. Null without a home. */
export const getActivity = cache(async () => {
  const overview = await getOverview()
  if (!overview) return null
  return (await unlessByDay(fetchActivity(overview.accessToken))) ?? []
})
