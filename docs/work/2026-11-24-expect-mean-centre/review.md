# Review: the expected-usage model's centre is the hour's mean

Bases: wattprint-backend 0272134cddc364011073323c589dc2c31030bcab (snapshot), wattprint-web
720c27bc3cc55e287e7023944d147deac0925f1b (snapshot).

## R1 (full, opus)
Backend package snapshot 8b95efe (its `dataset/research_v3/` is the separate NILM research, not this change);
web package snapshot db6af97.

Verdict: fix 1. 41 tests passed in the reviewer's run.
1. Should fix: the shared `weather_inputs` fallback also changes the billing heater advice (days past the forecast
   counted, was 0 W) with no test. Fixed: spec Areas of concern 4 records it as intended;
   `test_heater_advice_counts_every_hour_to_the_cycle_s_end` pins an 8-day cycle's saving.
2. Minor: `debt.md` entries not rewritten. Fixed in this change (House 2 still loses, coverage 35–65 %, bias
   0.8–1.9 kWh/day).
3. Minor: OpenAPI text said "P50 the usual". Fixed: "P50 the mean".
Declined by the reviewer, recorded: fewer anomalies fire from a higher `p50` (spec concern 4); old `ctx-v2` bundles
run the new `predict` until the deploy retrain.

## R2 (scoped, sonnet)
Packages: backend /tmp/sdlc-review-8b95efe-7ce636e.md (snapshot 7ce636e), web /tmp/sdlc-review-db6af97-3120892.md
(snapshot 3120892).

R2 verdict: ship, all three addressed (reviewer could not run the test; it passes here: 9 passed).
