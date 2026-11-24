# Review: savings plan

Bases: wattprint-web 763598565faa, wattprint-backend 2d8005cd8ea1.
R1 snapshots: web cf30603f38102a381f4736ee74ac2c0515c8165a, backend 2dd43b9d78e3c9f1da99ba37af2a45d2ca2d85fa.

## R1 (full, opus) — verdict: fix 1, 2, 3

Backend: fine (additive field, tested).

| # | Level | Finding | Status |
|---|---|---|---|
| 1 | Must | The plan's model came from cycle days only: on a cycle's first day (or before any 20-hour day) `model = "none"`, so `sameModel` stays false and the plan never tracks | Fix: model from the raw hours of a window that reaches back 7 days before the cycle |
| 2 | Must | An ended plan loses its result: actuals came from the current cycle's days, and `worth` from the current cycle's kWh | Fix: the plan stores actual next to expected per day, and the forecast kWh at the start (prices at F, which also covers Minor 7) |
| 3 | Must | `trainedOn` read the UTC stamp as a local date: a model trained 00:00–07:00 ICT allowed a start on a training day | Fix: convert the stamp to ICT (see ruling) |
| 4 | Should | The weekly check-in had no device rows (req. 13) | Fix: each week row lists each planned device's mean for that week against its baseline |
| 5 | Should | The 7-day window split in `getExpectedDays` had no test | Fix: pure `windows()` helper in `energy/expected.ts`, tested |
| 6 | Minor | No-tariff home shows the empty state, not kWh-only actions | Debt |
| 7 | Minor | Whole-home money priced at kWh so far, not at F | Covered by fix 2 |
| 8 | Minor | Web requires `model_version`: deploy the backend first | Debt (deploy note) |

Ruling: 3, "use the next local day" — the training set is the local days before the training day
(`train_home`: `hi = _midnight(now, tz)`), so the training day itself is already out-of-sample; the ICT date of the
stamp is the earliest valid start — cost if wrong: one in-sample day in a backdated plan.

## R2 (scoped, sonnet) — verdict: ship

Snapshot: R1 web cf30603 → fix package `--since cf30603f38102a381f4736ee74ac2c0515c8165a`. Backend unchanged after R1.
All five R1 findings addressed. Minors (to debt):
- An ended plan's device rows average to today, not to `plan.end`.
- A plan that ended more than a week before the page is next opened misses its last days (the page fetches from a
  week before the cycle).
- Plans stored before this fix (no `forecastKwh`) read as no plan; acceptable, the feature has not shipped.

# Change 2 (plans on the backend)

Bases: web snapshot b06f22262e85, backend snapshot 3ff8a6bbe36d.
R1 packages: web `/tmp/sdlc-review-b06f222-d929f1f.md` (Snapshot d929f1f…), backend `/tmp/sdlc-review-3ff8a6b-c94161b.md`
(Snapshot c94161b…).

## R1 (full, opus) — verdict: fix 1, 2, 3

| # | Level | Finding | Status |
|---|---|---|---|
| 1 | Must | The expectation follows the home's 7-day level (`base_7d`, recomputed hourly), so it drops to meet a saving within a week, model version or not | Fix: plan days are predicted with the usage-derived inputs (`base_7d`, `presence`) as known at the start, observed weather otherwise; a day is set once (≥20 measured hours) and kept |
| 2 | Should | `freeze_plans` has no database test (filters, bounds, backdated start) | Fix: service test with plan rows and stubbed model inputs |
| 3 | Should | `getPlan` / `getPlanBasis` error-to-null rules untested | Fix: Vitest for 404/422 → null, 500 → throws |
| 4 | Minor | A running plan is hidden when the basis is null | Debt |
| 5 | Minor | Two concurrent creates: the unique index gives a 500, not 409 | Debt |
| 6 | Minor | `create_plan` freezes every plan of the home in the request; a failure there is a 500 | Debt |

Note (declined by the reviewer, answered by fix 1): with pinned inputs a refit no longer stops new days, so a plan is
measured across the whole cycle instead of up to 7 days.

## Change 2, R2 (scoped, sonnet) — verdict: ship

Packages `--since` d929f1f (web) and c94161b (backend). All three R1 findings addressed, no new breakage.
Minor (to debt): after a refit, `freeze_plans` adds the plan's own model's bias to the new model's predictions.

## Change 3 (history, demo plans, UX pass), R1 (full, opus)
Bases: web snapshot 75fe01a, backend snapshot 58a7696. Packages: web `/tmp/sdlc-review-75fe01a-9e7631a.md`
(Snapshot 9e7631a…), backend `/tmp/sdlc-review-58a7696-df45b75.md` (Snapshot df45b75…).

Backend: ship. Web: fix 1, 2, 3.

| # | Repo | Level | Finding | Status |
|---|---|---|---|---|
| 1 | web | Must | `fallback={null}` on content (device page anomalies and watches) breaks routes.md | Fix: anomalies render inside the stats' boundary, watches get their skeleton back; the same pattern on the plan page's history pill gets a sized skeleton |
| 2 | web | Should | `outcomeOf` (local stop day, whole-cycle rule, days run) untested | Fix: moved to `math.ts`, Vitest for mid-cycle, last day, after it, never stopped |
| 3 | web | Should | `/dashboard/plan/[id]` has no smoke | Fix: added to `e2e/smoke.spec.ts` |
| 4–11 | web | Minor | past-tense hero copy on a past plan; Link nested in the phone card's button; history pill / stepper throw on a 500; `getDevice` per action for its type; vi/en copy drift; unused keys/props; `order-first` vs focus order; dates without a year | Debt |
| B1–B2 | backend | Minor | seed deletes before it knows it can rebuild; `measure_days` export only for the seed | Debt |

## Change 3, R2 (scoped, sonnet) — verdict: ship
Package `--since` 9e7631a (web). Findings 1–3 addressed, no new breakage. Minor: the watches skeleton shows and
vanishes for a viewer without watches (required by routes.md; accepted). Backend shipped at R1, unchanged since but
for the separate weather-source change (its own review: docs/work/2026-11-24-weather-source/).

## Debt pass (spec-debt.md), R1 (full, opus)
Bases: web 8ed7b5a, backend 60da865. Packages: web `/tmp/sdlc-review-8ed7b5a-0657aa8.md` (Snapshot 0657aa8…),
backend `/tmp/sdlc-review-60da865-092c711.md` (Snapshot 092c711…).

Backend: fix 1, 2.
| # | Level | Finding | Status |
|---|---|---|---|
| B1 | Should | A freeze failing after it wrote the new plan's days expires the plan (savepoint rollback); the reply then 500s | Fix: `s.refresh(plan)` in the except; test stubs a freeze that writes then raises (failed first: 500) |
| B2 | Should | The refit path through `freeze_plans` lost its test when the freeze test moved to the plan's own model | Fix: the freeze test runs for the own model (7.48) and after a refit (0.24 × 14 → 7.24) |
| B3 | Minor | The bias formula in three places (`day_bias`, `plan_basis`, the seed) | Fixed: one `model_error(residuals)` used by all three |

Web: fix 1, 2, 3.
| # | Level | Finding | Status |
|---|---|---|---|
| W1 | Must | The cycle day as a 28-pill `choice` overflows sideways and saves on every arrow key | Fix: back to the numeric text field with `within(1, 28)` |
| W2 | Must | "Ngày X/Y của kỳ" rounds hours: day 0 on the first morning, yesterday's number every morning | Fix: `cycleDay(start, end, now)` on Vietnam days (features/billing/forecast.ts, tested first) |
| W3 | Should | A statistics tile whose partner does not render leaves half a row empty (Rooms/Devices, Forecast/Months) | Fix: each tile takes the whole row (`WHOLE`) when its partner will not render |
| W4 | Minor | `Groups` delays the tiles' reads behind the home check | Fixed: the reads start in `Groups` before the await |
| W5 | Minor | Missing data and a tariff change: the Alert title names only the first | Fixed: `overview.partialStraddle` |
| W6 | Minor | The "no tariff: empty state" note was dropped from debt.md though only the running-plan case was paid | Ruling: a home without a tariff has no device advice, so no plan to build — a product limit, recorded in spec-change2.md Areas of concern 3, not debt — cost if wrong: nothing hidden, the empty state says why |
| W7 | Minor | `cardCell` duplicates `cell` | Fixed: one `DeviceName` with a `link` flag |
| W8 | Minor | The statistics header comment was stale | Fixed |

## Debt pass, R2 (scoped, sonnet) — web ship, backend ship
All R1 findings addressed (web W1–W3 and Minors; backend B1–B3). Two new Minors in the web fix, fixed after the loop:
the rooms tile no longer fails with the device forecasts (`.catch(() => null)`, it only picks the width; the header
comment says it waits for them), and the reads started in `Groups` carry a catch, so an early failure is not an
unhandled rejection (each tile still awaits the same promise and shows its error).
