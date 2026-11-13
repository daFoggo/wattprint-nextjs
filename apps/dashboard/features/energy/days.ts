export const HOUR = 3_600_000
export const DAY = 24 * HOUR
// Asia/Ho_Chi_Minh has no DST: the backend cuts its days at the same instant (17:00 UTC).
const ICT = 7 * HOUR

/** The instant (ms) the local day holding `ms` began. */
export const localMidnight = (ms: number) =>
  Math.floor((ms + ICT) / DAY) * DAY - ICT
/** The local date ("YYYY-MM-DD") holding `ms`. */
export const localDate = (ms: number) =>
  new Date(ms + ICT).toISOString().slice(0, 10)
/** The instant (ms) a local date ("YYYY-MM-DD") began. */
export const dateStart = (date: string) => Date.parse(`${date}T00:00:00Z`) - ICT

/** The same date a month earlier ("2026-11-01" → "2026-10-01"); a day the month lacks becomes its last ("03-31" → "02-28"). */
export function monthBefore(date: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  const last = new Date(Date.UTC(y, m - 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m - 2, Math.min(d, last)))
    .toISOString()
    .slice(0, 10)
}

/**
 * The home's background load (W): the median of the last 7 whole days' lowest draw, so one odd day does not move
 * it. Null with fewer than 7 such days.
 */
export function backgroundLoad(
  baseline: { date: string; watts: number }[],
  now: number
) {
  const week = baseline
    .filter((d) => d.date < localDate(now))
    .slice(-7)
    .map((d) => d.watts)
    .sort((a, b) => a - b)
  return week.length === 7 ? week[3]! : null
}

/** A local date ("YYYY-MM-DD") as words in `locale`, e.g. "Thu, Nov 12". Pure: no clock, same on server and client. */
export function dayLabel(
  date: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  }
) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, {
    ...options,
    timeZone: "UTC",
  })
}

export type Day = { date: string; value: number }

/**
 * The newest `count` runs of `size` days against the `count` runs before them, oldest first.
 * Null when there are fewer than 2 * count * size days. size 1 = day by day, size 7 = week by week.
 */
export function comparePeriods(days: Day[], size: number, count: number) {
  const need = 2 * size * count
  if (days.length < need) return null
  const tail = days.slice(-need)
  const sum = (from: number) =>
    tail.slice(from, from + size).reduce((s, d) => s + d.value, 0)
  return Array.from({ length: count }, (_, i) => {
    const at = (count + i) * size
    return {
      first: tail[at]!.date,
      last: tail[at + size - 1]!.date,
      current: sum(at),
      previous: sum(i * size),
    }
  })
}
