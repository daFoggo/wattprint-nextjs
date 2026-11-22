export type Range = "day" | "week" | "month" | "quarter"
export type Point = { ts: number; watts: number }

/** The range a power chart opens on: the first with readings, so a meter gap in the last day does not open empty. */
export function startRange(ranges: Partial<Record<Range, Point[]>>): Range {
  const keys = Object.keys(ranges) as Range[]
  return keys.find((k) => ranges[k]?.length) ?? keys[0]!
}
