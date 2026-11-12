import type { LogLine } from "@workspace/ui/components/hairline/log-stream"
import type { DonutSlice } from "@workspace/ui/components/hairline/donut-chart"

// shortcut: sample data in the shape NILM will produce (REFIT House 2 appliances); replace with
// /energy/devices and /energy/events when the NILM worker lands (step 4 of the backend plan
// wattprint-backend/docs/superpowers/plans/2026-11-12-data-pipeline-live-dashboard.md).

/** Today so far by device, in kWh. */
export const DEMO_DEVICES_TODAY: DonutSlice[] = [
  { id: "always-on", label: "Always on", value: 1.9 },
  { id: "fridge", label: "Fridge-freezer", value: 1.2 },
  { id: "kettle", label: "Kettle", value: 0.7 },
  { id: "washer", label: "Washing machine", value: 0.6 },
  { id: "tv", label: "Television", value: 0.4 },
  { id: "other", label: "Other", value: 0.3 },
]

/** The last 7 days by device, in kWh. */
export const DEMO_DEVICES_WEEK: DonutSlice[] = [
  { id: "always-on", label: "Always on", value: 13.3 },
  { id: "fridge", label: "Fridge-freezer", value: 8.4 },
  { id: "kettle", label: "Kettle", value: 4.6 },
  { id: "washer", label: "Washing machine", value: 3.8 },
  { id: "tv", label: "Television", value: 3.1 },
  { id: "other", label: "Other", value: 2.2 },
]

// [minutes before the latest reading, device, what happened, room]
const EVENTS: [number, string, string, string][] = [
  [4, "Kettle", "was on for 3 min, now off", "Kitchen"],
  [18, "Fridge-freezer", "turned on", "Kitchen"],
  [41, "Television", "turned on", "Living room"],
  [63, "Washing machine", "finished a 58 min cycle", "Utility"],
  [95, "Microwave", "was on for 2 min, now off", "Kitchen"],
  [122, "Toaster", "was on for 3 min, now off", "Kitchen"],
  [161, "Fridge-freezer", "turned on", "Kitchen"],
  [204, "Dishwasher", "was on 2 times, now off", "Kitchen"],
]

/** Today's device events, oldest first, timed back from `latest` (ms) so the sample reads as recent. */
export function demoDeviceEvents(latest: number): LogLine[] {
  return [...EVENTS].reverse().map(([ago, device, what, room]) => ({
    id: `${device}-${ago}`,
    at: latest - ago * 60_000,
    level: "info",
    message: `${device} ${what}`,
    source: room,
  }))
}

export type DemoDevice = {
  id: string
  name: string
  room: string
  on: boolean
  watts: number
  todayKwh: number
  /** One line for the row's detail, e.g. how long it has been on. */
  note: string
}

/** The home's devices with their state right now (REFIT House 2's appliances). */
export const DEMO_DEVICES: DemoDevice[] = [
  {
    id: "fridge",
    name: "Fridge-freezer",
    room: "Kitchen",
    on: true,
    watts: 82,
    todayKwh: 1.2,
    note: "On for 18 min, cycles about every 40 min",
  },
  {
    id: "tv",
    name: "Television",
    room: "Living room",
    on: true,
    watts: 21,
    todayKwh: 0.4,
    note: "On for 41 min",
  },
  {
    id: "hifi",
    name: "Hi-fi",
    room: "Living room",
    on: true,
    watts: 9,
    todayKwh: 0.2,
    note: "On standby since this morning",
  },
  {
    id: "kettle",
    name: "Kettle",
    room: "Kitchen",
    on: false,
    watts: 0,
    todayKwh: 0.7,
    note: "Off for 4 min, 5 boils today",
  },
  {
    id: "washer",
    name: "Washing machine",
    room: "Utility",
    on: false,
    watts: 0,
    todayKwh: 0.6,
    note: "Finished a 58 min cycle an hour ago",
  },
  {
    id: "dishwasher",
    name: "Dishwasher",
    room: "Kitchen",
    on: false,
    watts: 0,
    todayKwh: 0.5,
    note: "Ran twice today",
  },
  {
    id: "microwave",
    name: "Microwave",
    room: "Kitchen",
    on: false,
    watts: 0,
    todayKwh: 0.1,
    note: "Off for 1 h 35 min",
  },
  {
    id: "toaster",
    name: "Toaster",
    room: "Kitchen",
    on: false,
    watts: 0,
    todayKwh: 0.1,
    note: "Off for 2 h",
  },
]
