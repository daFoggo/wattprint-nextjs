import type { Alert } from "./schemas"

/**
 * An alert's payload as the values its words read: ICU selects read strings, so a boolean (a watch's `repeat`)
 * becomes "true"/"false", a run's start reads as a time of day, and an alert stored before watches could repeat
 * reads as one that does not.
 */
export function alertValues(
  payload: Record<string, unknown>,
  device: string,
  time: (iso: string) => string
): Record<string, string | number> {
  const values: Record<string, string | number> = { device, repeat: "false" }
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === "boolean") values[k] = String(v)
    else if ((k === "at" || k === "start") && typeof v === "string")
      values[k] = time(v)
    else if (typeof v === "string" || typeof v === "number") values[k] = v
  }
  return values
}

/** The device anomaly signals the backend raises (payload.signal). */
export const DEVICE_SIGNALS = [
  "daily",
  "long_run",
  "odd_hour",
  "denser",
] as const
type Signal = (typeof DEVICE_SIGNALS)[number]
type Kind = Alert["kind"]

/** The copy key of an alert: a device anomaly reads its signal's (daily, long_run, odd_hour, denser). */
export function alertKey(a: {
  kind: string
  payload: Record<string, unknown>
}): Exclude<Kind, "device_anomaly"> | `device_anomaly.${Signal}` {
  if (a.kind === "device_anomaly") {
    const signal = DEVICE_SIGNALS.find((x) => x === a.payload.signal) ?? "daily"
    return `device_anomaly.${signal}`
  }
  return a.kind as Exclude<Kind, "device_anomaly">
}
