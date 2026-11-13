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
