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
