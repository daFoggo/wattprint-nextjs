import type messages from "@/messages/vi/energy.json"

import { dateStart, DAY, HOUR, localDate, localMidnight } from "./days"

// shortcut: sample devices in the shape NILM will produce (REFIT House 2's appliances); replace with
// the device endpoints when the NILM worker lands (step 4 of the backend plan
// wattprint-backend/docs/superpowers/plans/2026-11-12-data-pipeline-live-dashboard.md).
// Every figure comes from one seeded schedule per device and day, so the list, a device's page,
// the activity and the mix agree with each other and stay the same across reloads.
// Names, rooms and tips are message keys (energy.demo.*), translated in queries.ts.

type Demo = (typeof messages)["demo"]
export type DeviceKey = keyof Demo["devices"]
export type RoomKey = keyof Demo["rooms"]

const MIN = 60_000
const STEP = 5 * MIN

type Profile = {
  room: RoomKey | null
  type: string
  typicalW: number | null
  /** Draw while on (W); a steady load's comes from the meter instead. */
  watts: number
  /** Compressor-style: on for `on` minutes, off for `off`, all day. */
  every?: { on: number; off: number }
  /** Runs starting at these local hours, each lasting about `minutes`. */
  at?: number[]
  minutes?: number
  /** Chance a run is skipped on a given day. */
  skip?: number
  /** Runs only every n-th day. */
  period?: number
  /** A steady load measured on the meter (background, unidentified) rather than runs. */
  constant?: true
  /** tb_device.show_on_timeline: the fridge's dozens of runs a day would bury the rest. */
  timeline?: false
}

const PROFILES: Record<DeviceKey, Profile> = {
  alwaysOn: {
    room: null,
    type: "always_on",
    typicalW: null,
    watts: 0,
    constant: true,
  },
  fridge: {
    room: "kitchen",
    type: "fridge_freezer",
    typicalW: 120,
    watts: 88,
    every: { on: 17, off: 26 },
    timeline: false,
  },
  kettle: {
    room: "kitchen",
    type: "kettle",
    typicalW: 2000,
    watts: 2050,
    at: [6.7, 9.9, 15.4, 19.2, 21.5],
    minutes: 3,
    skip: 0.2,
  },
  washer: {
    room: "utility",
    type: "washing_machine",
    typicalW: 500,
    watts: 430,
    at: [9.4],
    minutes: 58,
    skip: 0.1,
    period: 2,
  },
  tv: {
    room: "livingRoom",
    type: "television",
    typicalW: 100,
    watts: 92,
    at: [18.4],
    minutes: 210,
    skip: 0.05,
  },
  hifi: {
    room: "livingRoom",
    type: "hifi",
    typicalW: 50,
    watts: 34,
    at: [19],
    minutes: 120,
    skip: 0.4,
  },
  dishwasher: {
    room: "kitchen",
    type: "dishwasher",
    typicalW: 1200,
    watts: 760,
    at: [20.6],
    minutes: 95,
    skip: 0.25,
  },
  microwave: {
    room: "kitchen",
    type: "microwave",
    typicalW: 1000,
    watts: 1150,
    at: [7.1, 12.4, 18.8],
    minutes: 3,
    skip: 0.3,
  },
  toaster: {
    room: "kitchen",
    type: "toaster",
    typicalW: 800,
    watts: 870,
    at: [7],
    minutes: 3,
    skip: 0.3,
  },
  other: {
    room: null,
    type: "other",
    typicalW: null,
    watts: 0,
    constant: true,
  },
}
const DEVICE_KEYS = Object.keys(PROFILES) as DeviceKey[]
// Own keys only: "constructor" or "toString" from a URL must not pass.
export const isDeviceKey = (id: string): id is DeviceKey =>
  Object.hasOwn(PROFILES, id)

/** mulberry32: the same seed gives the same numbers on every run. */
function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

type Run = { start: number; end: number; watts: number }

/** The runs a device starts on the local day beginning at `day` (ms). */
function runsOn(key: DeviceKey, day: number, now: number): Run[] {
  const p = PROFILES[key]
  const index = Math.round(day / DAY)
  const r = random(index * 97 + DEVICE_KEYS.indexOf(key) * 7919)
  const runs: Run[] = []
  const watts = () => p.watts * (0.95 + r() * 0.1)
  if (p.every) {
    // The last three days the fridge runs longer each time: the sample's "longer than usual" alert.
    const longer = localMidnight(now) - day < 3 * DAY ? 7 : 0
    let t = day + r() * p.every.off * MIN
    while (t < day + DAY) {
      const on = (p.every.on + longer + (r() - 0.5) * 4) * MIN
      runs.push({ start: t, end: t + on, watts: watts() })
      t += on + (p.every.off + (r() - 0.5) * 6) * MIN
    }
  }
  for (const hour of p.at ?? []) {
    const skipped = r() < (p.skip ?? 0)
    if (skipped || (p.period && index % p.period)) continue
    const start = day + hour * HOUR + (r() - 0.5) * 40 * MIN
    const minutes = (p.minutes ?? 0) * (0.8 + r() * 0.4)
    runs.push({ start, end: start + minutes * MIN, watts: watts() })
  }
  return runs
}

const kwh = (watts: number, ms: number) => (watts * ms) / HOUR / 1000

/** Energy between `from` and `to` (ms) of a device with runs, and the runs it came from, cut at `now`. */
function usage(key: DeviceKey, from: number, to: number, now: number) {
  const end = Math.min(to, now)
  const runs: Run[] = []
  for (let day = localMidnight(from); day < end; day += DAY) {
    for (const run of runsOn(key, day, now)) {
      if (run.start >= from && run.start < end) runs.push(run)
    }
  }
  const total = runs.reduce(
    (s, run) => s + kwh(run.watts, Math.min(run.end, now) - run.start),
    0
  )
  return { kwh: total, runs }
}

/** Average draw (W) over [from, from + span) of a device with runs. */
function drawAt(key: DeviceKey, from: number, span: number, now: number) {
  let energy = 0
  for (const day of [localMidnight(from) - DAY, localMidnight(from)]) {
    for (const run of runsOn(key, day, now)) {
      const a = Math.max(run.start, from)
      const b = Math.min(run.end, from + span, now)
      if (b > a) energy += run.watts * (b - a)
    }
  }
  return energy / span
}

/** A steady level with a little flicker, so it reads as measured rather than drawn with a ruler. */
const flicker = (watts: number, at: number) =>
  watts * (0.94 + random(Math.round(at / STEP))() * 0.12)

/**
 * What the main meter really read: kWh per local day ("YYYY-MM-DD", today so far), the background load (W) and
 * the draw now. The sample hangs off it as NILM's output will: "always on" is the measured background load and
 * "other" whatever the meter read beyond the devices, so the devices always add up to the meter.
 */
export type Meter = {
  kwh: Map<string, number>
  baseline: number
  live: number | null
}

const KNOWN = DEVICE_KEYS.filter((key) => !PROFILES[key].constant)
// What NILM puts down to a device, of what the meter reads above the background load.
const IDENTIFIED = 0.85

const monthStart = (now: number) => dateStart(`${localDate(now).slice(0, 8)}01`)

/**
 * The sample schedules know nothing of the real home's habits, so their energy is scaled (1 to 4 times, for the
 * month) to cover `IDENTIFIED` of the meter above the background load, as a working NILM would; "other" is the rest.
 * Only kWh scale: draws (W) stay each appliance's own, so a fridge never reads 300 W.
 */
function scaleFor(now: number, meter: Meter) {
  const month = monthStart(now)
  const hours = (now - month) / HOUR
  let total = 0
  for (let day = month; day <= now; day += DAY)
    total += meter.kwh.get(localDate(day)) ?? 0
  const known = KNOWN.reduce((s, key) => s + usage(key, month, now, now).kwh, 0)
  const target = IDENTIFIED * (total - (meter.baseline * hours) / 1000)
  return known > 0 ? Math.min(4, Math.max(1, target / known)) : 1
}

/** A device's kWh on the local day beginning at `day`, up to `now`; `scale` from `scaleFor`. */
function dayKwh(
  key: DeviceKey,
  day: number,
  now: number,
  meter: Meter,
  scale: number
): number {
  if (key === "alwaysOn")
    return kwh(meter.baseline, Math.max(0, Math.min(day + DAY, now) - day))
  if (key === "other") {
    const known = [...KNOWN, "alwaysOn" as const].reduce(
      (s, k) => s + dayKwh(k, day, now, meter, scale),
      0
    )
    return Math.max(0, (meter.kwh.get(localDate(day)) ?? 0) - known)
  }
  return usage(key, day, day + DAY, now).kwh * scale
}

/** Today's figures for every device in kWh; `month_kwh` runs from the 1st of this month. */
export function demoDevices(now: number, meter: Meter) {
  const today = localMidnight(now)
  const month = monthStart(now)
  const scale = scaleFor(now, meter)
  const running = (key: DeviceKey) => {
    const run = usage(key, today - DAY, now + 1, now).runs.find(
      (r) => r.end > now
    )
    return run && run.watts * scale
  }
  const busy = KNOWN.reduce((s, key) => s + (running(key) ?? 0), 0)
  return DEVICE_KEYS.map((key) => {
    const p = PROFILES[key]
    const watts =
      key === "alwaysOn"
        ? meter.baseline
        : key === "other"
          ? Math.max(0, (meter.live ?? 0) - meter.baseline - busy)
          : running(key)
    let monthKwh = 0
    for (let day = month; day <= today; day += DAY)
      monthKwh += dayKwh(key, day, now, meter, scale)
    return {
      key,
      room: p.room,
      type: p.type,
      on: p.constant ? Boolean(watts) : watts !== undefined,
      watts: Math.round(watts ?? 0),
      today_kwh: dayKwh(key, today, now, meter, scale),
      month_kwh: monthKwh,
      week_kwh: Array.from({ length: 7 }, (_, i) =>
        dayKwh(key, today - (6 - i) * DAY, now, meter, scale)
      ),
    }
  })
}

/** Everything a device's page shows, in kWh and W; `home_share` is of the whole meter this month. */
export function demoDevice(key: DeviceKey, now: number, meter: Meter) {
  const p = PROFILES[key]
  const today = localMidnight(now)
  const month = monthStart(now)
  const rows = demoDevices(now, meter)
  const scale = scaleFor(now, meter)
  const row = rows.find((d) => d.key === key)!
  const all = rows.reduce((s, d) => s + d.month_kwh, 0)
  const { runs } = usage(key, month, now, now)
  const onMs = runs.reduce(
    (s, run) => s + Math.min(run.end, now) - run.start,
    0
  )
  const elapsed = (now - month) / DAY
  // A steady load draws its month's average all the time.
  const level = (row.month_kwh * 1000) / (elapsed * 24)
  const from = Math.floor((now - DAY) / STEP) * STEP + STEP
  return {
    ...row,
    typical_w: p.typicalW,
    avg_on_w: Math.round(
      // Its own draw: the scale grows its kWh, not its watts.
      p.constant
        ? level
        : onMs
          ? ((row.month_kwh / scale) * 1000 * HOUR) / onMs
          : 0
    ),
    peak_w: Math.round(
      p.constant ? level * 1.06 : Math.max(0, ...runs.map((run) => run.watts))
    ),
    home_share: all ? row.month_kwh / all : 0,
    year_kwh: (row.month_kwh / elapsed) * 365,
    days: Array.from(
      { length: Math.round((today - month) / DAY) + 1 },
      (_, i) => {
        const day = month + i * DAY
        return {
          date: localDate(day),
          kwh: dayKwh(key, day, now, meter, scale),
        }
      }
    ),
    power: Array.from({ length: 288 }, (_, i) => {
      const ts = from + i * STEP
      return {
        ts,
        watts: Math.round(
          p.constant ? flicker(level, ts) : drawAt(key, ts, STEP, now)
        ),
      }
    }),
    cycles: recentCycles(key, now, scale),
  }
}

/** Runs started in the last 24 hours, oldest first. */
function recentCycles(key: DeviceKey, now: number, scale: number) {
  return usage(key, now - DAY, now, now)
    .runs.map((run) => ({
      start: run.start,
      end: run.end > now ? null : run.end,
      kwh: kwh(run.watts, Math.min(run.end, now) - run.start) * scale,
    }))
    .sort((a, b) => a.start - b.start)
}

/** The last 24 hours' runs of every device shown on the timeline, oldest first. */
export function demoActivity(now: number, meter: Meter) {
  const scale = scaleFor(now, meter)
  return DEVICE_KEYS.filter((key) => PROFILES[key].timeline !== false)
    .flatMap((key) =>
      recentCycles(key, now, scale).map((cycle) => ({
        ...cycle,
        key,
        room: PROFILES[key].room,
      }))
    )
    .sort((a, b) => a.start - b.start)
}
