import type messages from "@/messages/vi/energy.json"

// shortcut: sample data in the shape NILM will produce (REFIT House 2 appliances); replace with
// /energy/devices and /energy/events when the NILM worker lands (step 4 of the backend plan
// wattprint-backend/docs/superpowers/plans/2026-11-12-data-pipeline-live-dashboard.md).
// Names, rooms and notes are message keys (energy.demo.*), so the sample reads in the page's language.

type Demo = (typeof messages)["demo"]
export type DeviceKey = keyof Demo["devices"]
type RoomKey = keyof Demo["rooms"]
type NoteKey = keyof Demo["notes"]
type EventKey = keyof Demo["events"]

export type DemoSlice = { id: DeviceKey; value: number }

/** Today so far by device, in kWh. */
export const DEMO_DEVICES_TODAY: DemoSlice[] = [
  { id: "alwaysOn", value: 1.9 },
  { id: "fridge", value: 1.2 },
  { id: "kettle", value: 0.7 },
  { id: "washer", value: 0.6 },
  { id: "tv", value: 0.4 },
  { id: "other", value: 0.3 },
]

/** The last 7 days by device, in kWh. */
export const DEMO_DEVICES_WEEK: DemoSlice[] = [
  { id: "alwaysOn", value: 13.3 },
  { id: "fridge", value: 8.4 },
  { id: "kettle", value: 4.6 },
  { id: "washer", value: 3.8 },
  { id: "tv", value: 3.1 },
  { id: "other", value: 2.2 },
]

/** Today's device events, newest first: minutes before the latest reading, device, what happened (with its numbers), room. */
export const DEMO_EVENTS: {
  ago: number
  device: DeviceKey
  event: EventKey
  values?: { min?: number; count?: number }
  room: RoomKey
}[] = [
  {
    ago: 4,
    device: "kettle",
    event: "offAfter",
    values: { min: 3 },
    room: "kitchen",
  },
  { ago: 18, device: "fridge", event: "turnedOn", room: "kitchen" },
  { ago: 41, device: "tv", event: "turnedOn", room: "livingRoom" },
  {
    ago: 63,
    device: "washer",
    event: "finishedCycle",
    values: { min: 58 },
    room: "utility",
  },
  {
    ago: 95,
    device: "microwave",
    event: "offAfter",
    values: { min: 2 },
    room: "kitchen",
  },
  {
    ago: 122,
    device: "toaster",
    event: "offAfter",
    values: { min: 3 },
    room: "kitchen",
  },
  { ago: 161, device: "fridge", event: "turnedOn", room: "kitchen" },
  {
    ago: 204,
    device: "dishwasher",
    event: "ranTimes",
    values: { count: 2 },
    room: "kitchen",
  },
]

/** The home's devices with their state right now (REFIT House 2's appliances); the row's note is energy.demo.notes[id]. */
export const DEMO_DEVICES: {
  id: DeviceKey & NoteKey
  room: RoomKey
  on: boolean
  watts: number
  todayKwh: number
}[] = [
  { id: "fridge", room: "kitchen", on: true, watts: 82, todayKwh: 1.2 },
  { id: "tv", room: "livingRoom", on: true, watts: 21, todayKwh: 0.4 },
  { id: "hifi", room: "livingRoom", on: true, watts: 9, todayKwh: 0.2 },
  { id: "kettle", room: "kitchen", on: false, watts: 0, todayKwh: 0.7 },
  { id: "washer", room: "utility", on: false, watts: 0, todayKwh: 0.6 },
  { id: "dishwasher", room: "kitchen", on: false, watts: 0, todayKwh: 0.5 },
  { id: "microwave", room: "kitchen", on: false, watts: 0, todayKwh: 0.1 },
  { id: "toaster", room: "kitchen", on: false, watts: 0, todayKwh: 0.1 },
]
