// shortcut: sample cohort and alerts in the shape of tb_cohort_stat and tb_alert; replace with the insight
// endpoints when the backend computes them. The alerts match the energy sample (the fridge's longer runs
// these last three days), and their device ids are the sample devices', so the links land on them.

/** 35 similar homes over 30 days: the stats store average watts, here as kWh for the period. */
const COHORT_W = { p10: 180, p33: 260, p66: 380, p90: 560 }
export const demoCohort = (days: number) => ({
  homes: 35,
  days,
  ...Object.fromEntries(
    Object.entries(COHORT_W).map(([k, w]) => [k, (w * 24 * days) / 1000])
  ),
})

const HOUR = 3_600_000

export const demoAlerts = (now: number) => [
  {
    id: "a1",
    kind: "longer_than_usual",
    severity: "warning",
    status: "open",
    ts: now - 5 * HOUR,
    device: { id: "fridge", type: "fridge_freezer" },
    payload: { usual_min: 17, recent_min: 24, days: 3 },
  },
  {
    id: "a2",
    kind: "new_device",
    severity: "info",
    status: "open",
    ts: now - 22 * HOUR,
    device: null,
    payload: { watts: 1500, minutes: 35 },
  },
  {
    id: "a3",
    kind: "repeated_cycle",
    severity: "info",
    status: "resolved",
    ts: now - 4 * 24 * HOUR,
    device: { id: "washer", type: "washing_machine" },
    payload: { count: 2 },
  },
]
