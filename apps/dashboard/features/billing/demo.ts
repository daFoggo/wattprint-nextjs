// shortcut: sample monthly kWh in the shape of tb_bill; replace with the bill history endpoint when the backend
// serves past cycles. Hot months run higher (air conditioning), last year a little higher than this one.

/** Seeded, so the sample is the same on every request. */
const jitter = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43_758.5453
  return 0.94 + (x - Math.floor(x)) * 0.12
}

const season = (m: number) => 1 + 0.45 * Math.exp(-((m - 6.5) ** 2) / 5)

/**
 * kWh for each whole month from January last year to the month before `month` ("YYYY-MM"), around `level`
 * (this cycle's kWh), so the sample sits at the home's real scale.
 */
export function demoMonths(month: string, level: number) {
  const [year, current] = month.split("-").map(Number) as [number, number]
  const base = level / season(current)
  return Array.from({ length: 12 + current - 1 }, (_, i) => {
    const y = year - 1 + Math.floor(i / 12)
    const m = (i % 12) + 1
    const kwh = base * season(m) * (y < year ? 1.06 : 1) * jitter(y * 12 + m)
    return { month: `${y}-${String(m).padStart(2, "0")}`, kwh: Math.round(kwh) }
  })
}
