# Review: demo readiness
Bases: backend 21fe144; web snapshot 0c8ee03 (HEAD 7bb2aad + docs).

## R1 (opus, full, backend and web) — verdicts: backend fix 1, 2; web ship
Backend
1. Should: R4 text vs code (first hour). Ruling: the code stands and the spec is amended — 30 minutes of the
   00:00 hour against a whole expected hour reads as a false drop — cost if wrong: Wappi cannot explain "today"
   before 01:00.
2. Should: demo-event wiring in detectors had no test. Fixed: tests/test_device_anomaly.py
   `test_staged_demo_runs_do_not_become_peers`, `test_a_training_scenario_keeps_its_runs_in_the_history` (passed
   at once, as the wiring was right; they pin `not sc.train`).
3. Minor: `compare_periods` kept its own cycle start. Fixed: uses `cycle_start`.
4. Minor: heater advice counted the whole running hour. Fixed: `heater_saving_from`, test
   `test_heater_advice_counts_the_running_hour_by_its_rest` RED→GREEN. The hour in which `ends_at` falls still counts
   whole (at most one hour of saving).
Web
5. Minor: dead `simulated` on the plan action. Fixed (plan-data.ts, plan/page.tsx).
6. Minor: top-tier note ignored that the price is before VAT. Fixed: "chưa gồm VAT" / "before VAT".
Declined to judge (rulings): R3 applies to every alert kind (as specified); R2 also removes demo runs from D4's
mean (follows from the same history); a `train=false` scenario with no end hides all later runs from D2/D3 (spec
Areas of concern); R5 only has the cycle-day hook (no tariff endpoint).
