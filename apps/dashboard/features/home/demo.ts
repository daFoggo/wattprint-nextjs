import type { HomeSettings } from "./schemas"

// shortcut: REFIT House 2's row in tb_home plus default preferences; replace with GET /homes/current when the
// backend serves it.
export const DEMO_SETTINGS: HomeSettings = {
  name: "REFIT House 2",
  home_type: "house",
  floor_area_m2: null,
  occupants: 4,
  billing_cycle_day: 1,
  show_cost: true,
  notify_anomaly: true,
  notify_tier: true,
  weekly_summary: false,
}
