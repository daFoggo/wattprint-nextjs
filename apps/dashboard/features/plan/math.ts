/** A tariff tier as `GET /billing/current` gives it: it prices the kWh in (from_kwh, to_kwh]. */
export type Tier = {
  from_kwh: number
  to_kwh: number | null
  price_per_kwh: number
}

const DAY = 86_400_000

/** A cycle's amount with VAT (VND) for `kwh`, priced tier by tier as the backend does. */
export function billFor(kwh: number, tiers: Tier[], vat: number) {
  const before = tiers.reduce((sum, t) => {
    const top = t.to_kwh === null ? kwh : Math.min(kwh, t.to_kwh)
    return sum + Math.max(top - t.from_kwh, 0) * t.price_per_kwh
  }, 0)
  return Math.round(before * (1 + vat))
}

/** The tier (1 first) a cycle of `kwh` ends in, as the backend places it. */
export const tierOf = (kwh: number, tiers: Tier[]) =>
  Math.max(tiers.filter((t) => kwh > t.from_kwh).length, 1)

/** What `delta` kWh off a cycle heading for `forecast` kWh is worth: the top of the bill, the marginal tiers. */
export const saving = (
  forecast: number,
  delta: number,
  tiers: Tier[],
  vat: number
) =>
  billFor(forecast, tiers, vat) -
  billFor(Math.max(forecast - delta, 0), tiers, vat)

/** The device forecast's error (%) stands in for the saving's: a heuristic, null when the backend has none. */
export function adviceRange(saved: number, errorPct: number | null) {
  if (errorPct === null) return null
  const k = errorPct / 100
  return { low: Math.max(saved * (1 - k), 0), high: saved * (1 + k) }
}

const floor5 = (watts: number) => Math.floor(watts / 5) * 5

/** The always-on cut the user picks: 5 W steps up to the background load. */
export function alwaysOnSteps(watts: number | null) {
  if (watts === null || watts < 5) return null
  // shortcut: a quarter of the load as the default is a guess, until homes' real cuts tell what is usual.
  return { min: 5, max: floor5(watts), value: Math.max(floor5(watts / 4), 5) }
}

/** Quick picks for the standby cut (a share of the load is easier to judge than watts), on the 5 W steps. */
export function alwaysOnPresets(watts: number) {
  const seen = new Set<number>()
  return [0.25, 0.5, 0.75].flatMap((share) => {
    const w = Math.max(floor5(watts * share), 5)
    if (seen.has(w)) return []
    seen.add(w)
    return [{ share, watts: w }]
  })
}

/** A cut of `watts` running all day for `days`, in kWh. */
export const alwaysOnKwh = (watts: number, days: number) =>
  (watts * 24 * days) / 1000

/**
 * How a daily saving compares with what can show above the day-to-day noise over `days` (2σ/√days, about 95%): 1 or
 * more shows; null when it cannot be judged. Treats days as independent, which makes the bar a little low.
 */
export function detectable(daily: number, s: number | null, days: number) {
  if (s === null || days <= 0) return null
  return daily / ((2 * s) / Math.sqrt(days))
}

/** Whether a daily saving shows above the noise over `days` (`detectable` ≥ 1); null when it cannot be judged. */
export function measurable(daily: number, s: number | null, days: number) {
  const ratio = detectable(daily, s, days)
  return ratio === null ? null : ratio >= 1
}

/** The plan's result so far: a cumulative saving inside ±2σ√n is still noise. */
export function verdict(cumulative: number, s: number | null, n: number) {
  if (s === null || n <= 0) return "early" as const
  const band = 2 * s * Math.sqrt(n)
  if (cumulative > band) return "saving" as const
  if (cumulative < -band) return "more" as const
  return "early" as const
}

/** The 7-day block from `start` a local date falls in, 0 first. */
export const weekOf = (start: string, date: string) =>
  Math.floor((Date.parse(date) - Date.parse(start)) / DAY / 7)

/** A device's mean kWh a day over the local dates in [from, to); null with none. */
export function meanKwh(
  days: { date: string; kwh: number }[],
  from: string,
  to: string
) {
  const inside = days.filter((d) => d.date >= from && d.date < to)
  return inside.length
    ? inside.reduce((s, d) => s + d.kwh, 0) / inside.length
    : null
}

/**
 * How a finished plan ended and what it came to against the frozen expectation: the kWh saved (negative: more used),
 * the verdict, the ±2σ√n band, and whether it ran its whole cycle (stopped after `end_on`, a Vietnam day, or never
 * stopped) or for how many days.
 */
export function outcomeOf(p: {
  start_on: string
  end_on: string
  sigma: number | null
  stopped_at: string | null
  days: { expected: number; actual: number }[]
}) {
  const saved = p.days.reduce((s, d) => s + d.expected - d.actual, 0)
  const stoppedOn = p.stopped_at
    ? new Date(Date.parse(p.stopped_at) + 7 * 3_600_000)
        .toISOString()
        .slice(0, 10)
    : null
  return {
    saved,
    verdict: verdict(saved, p.sigma, p.days.length),
    band: p.sigma === null ? null : 2 * p.sigma * Math.sqrt(p.days.length),
    whole: stoppedOn === null || stoppedOn > p.end_on,
    ranDays: stoppedOn
      ? Math.round(
          (Date.parse(stoppedOn) - Date.parse(p.start_on)) / 86_400_000
        )
      : 0,
  }
}

/**
 * What the page measures against: the live basis and forecast when there are, else the running plan's own record
 * (a tariff or forecast gone mid-cycle must not hide a plan already running). Null with neither.
 */
export function measuredBy(
  plan: {
    end_on: string
    forecast_kwh: number
    model_version: string
    sigma: number | null
  } | null,
  basis: {
    period_end: string
    model_version: string
    sigma: number | null
    earliest_start: string
  } | null,
  forecast: { kwh: number } | null
) {
  if (basis && forecast)
    return {
      periodEnd: basis.period_end,
      forecastKwh: forecast.kwh,
      model: basis.model_version,
      sigma: basis.sigma,
      earliestStart: basis.earliest_start as string | null,
    }
  if (!plan) return null
  return {
    periodEnd: plan.end_on,
    forecastKwh: plan.forecast_kwh,
    model: plan.model_version,
    sigma: plan.sigma,
    earliestStart: null,
  }
}

/** The planned devices, once each (two actions on one heater are one device), in plan order. */
export function plannedDevices<A extends { device_id: string | null }>(
  actions: A[]
) {
  return [
    ...new Map(
      actions.flatMap((a) => (a.device_id ? [[a.device_id, a] as const] : []))
    ).values(),
  ]
}

/** The `?add=` ids still advised (in order, once, at most `max`), and how many are no longer advised. */
export function preselected(
  ids: string[],
  advice: { id: string }[],
  max: number
) {
  const known = new Set(advice.map((a) => a.id))
  const unique = [...new Set(ids)]
  return {
    picked: unique.filter((id) => known.has(id)).slice(0, max),
    gone: unique.filter((id) => !known.has(id)).length,
  }
}

/**
 * A planned device's kWh a day over [from, to) against what it was expected to use: its frozen days (its own model,
 * weather included) when it has any there, else its NILM days against its usual before the plan (`baseline`).
 */
export function deviceVs(
  planDays: {
    date: string
    devices: Record<string, { expected: number; actual: number }>
  }[],
  deviceId: string,
  usual: { date: string; kwh: number }[],
  baseline: number | null,
  from: string,
  to: string
) {
  const frozen = planDays.flatMap((d) => {
    const v = d.date >= from && d.date < to ? d.devices[deviceId] : undefined
    return v ? [v] : []
  })
  if (frozen.length)
    return {
      now: frozen.reduce((s, v) => s + v.actual, 0) / frozen.length,
      before: frozen.reduce((s, v) => s + v.expected, 0) / frozen.length,
      weather: true,
    }
  const now = meanKwh(usual, from, to)
  return now === null || baseline === null
    ? null
    : { now, before: baseline, weather: false }
}
