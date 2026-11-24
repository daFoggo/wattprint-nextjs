# Spec, change 2: savings plans stored on the backend
Intent: [intent.md](intent.md) (prototype debt, user: "xử lý đến khi hoàn thiện đi" — calls delegated). Status:
approved by delegation. Bases: web snapshot b06f22262e85, backend snapshot 3ff8a6bbe36d.

## Requirements

**Backend (wattprint-backend, insight module)**

1. Add a new table `tb_savings_plan` (Alembic revision; the ORM model mirrors it):
   - `id` (uuid7), `user_id` and `home_id` (FK, cascade)
   - `start_on` and `end_on` (date)
   - `model_version` (text), `sigma` (numeric, nullable), `forecast_kwh` (numeric)
   - `actions` (jsonb), `days` (jsonb, default `{}`)
   - `status` (`active` | `stopped`), `created_at`, `stopped_at`

   A partial unique index allows at most one `active` plan per (user, home).

2. `POST /api/v1/insights/plans` (201; the insight router's prefix). Any member may call it, including a read-only demo viewer, because a plan belongs to
   the person, not to the home. The body is `{ start_on, actions: [{ device_id | null, key, label, kwh, amount,
   baseline, watts }] }` with 1–3 actions.
   - **The server derives:**
     - `end_on`: the running cycle's last day.
     - `model_version`: the active home model, or `"none"`.
     - `forecast_kwh`: the cycle forecast's kWh.
     - `sigma` and `bias`: the standard deviation and the mean of the active model's out-of-sample daily residuals
       (`Bundle.residuals`, days the model did not learn from); null and 0 under 14 residuals. Each frozen day's
       expected adds `bias × measured hours / 24`. Measured on the demo homes: σ 3.4–4.4 kWh, bias +2.9–3.7 kWh;
       without the bias every plan read "dùng nhiều hơn dự kiến".
   - **The server validates:**
     - `start_on` lies in the cycle, is not before the model's training day (its ICT date), and is not after today.
     - `key` is one of `fewer_runs`, `kettle_fill`, `fridge_check`, `heater_setpoint`, `heater_earlier_off`,
       `always_on`.
     - `device_id` is null exactly for `always_on`, and otherwise is one of the home's devices.
     - Numbers are finite and ≥ 0. `kwh` is at most the cycle forecast. `label` is 1–200 characters.
   - Errors: 409 `plan_exists` when an active plan exists; 422 on bad input; 404 `home_not_found` / no tariff, as the
     billing endpoints do.
3. `GET /api/v1/insights/plans/current` returns the user's active plan for the home, or 404 `plan_not_found`. `days` is a list
   of `{ date, expected, actual }`, oldest first.
4. `DELETE /api/v1/insights/plans/current` (204) sets `status = stopped` and `stopped_at`. It returns 404 if there is no active
   plan.
5. **Freezing**, in the hourly `expect_refresh` job, **before** `refresh_home`, and once right after a plan is
   created:
   - The job covers every `active` plan of the home whose `end_on` ≥ today − 7.
   - For each local day from `start_on` to min(`end_on`, yesterday) not yet stored, the active model predicts the
     hours with observed weather but the usage-derived inputs (`base_7d`, `presence`) as known at `start_on`.
     Live, those two follow the plan's own lower use within a week and learn the saving away (change 2, R1 #1).
   - A day with ≥ 20 measured hours is stored once: `{expected: Σ P50 + bias × hours / 24, actual}` over those same
     hours. It is never rewritten. A refit therefore stops nothing: its ratio model learns from at most a few plan
     days among about 180.
   - A failure is logged and does not stop `refresh_home`.

4b. `GET /api/v1/insights/plans/basis` returns what a plan started now is measured against: `model_version`,
   `sigma`, `bias`, `earliest_start`, `period_end`. The page takes its start floor and measurability σ from it, so
   the web no longer derives them (its `trainedOn`, `sigma` and `getExpectedDays` go).

**Web (wattprint-web)**

6. `features/plan/server.ts`, `queries.ts` (`getPlan`, null on 404) and `actions.ts` (`createPlanAction`,
   `stopPlanAction`: authorize → Zod → write → refresh). They replace `store.ts` and `localStorage`. The page reads the
   plan on the server, so the hydration skeleton goes away.
7. `PlanProgress` takes `days` from the plan. The client-side `freeze` goes away; its logic now lives in the backend
   job (requirement 5).
8. The "Kế hoạch chỉ lưu trên trình duyệt này" note goes away.
9. The statistics page's device list gets "Thêm vào kế hoạch" on its top advice.

## Design
- Backend: follow the watch pattern (`insight/routes/watches.py`, `services/watches.py`, `repo_watch.py`).
  - Pricing and the cycle come from `app.modules.billing.api` (`forecast_bill`, `current_bill`).
  - The model and the hours come from `app.modules.expect.api` (`active_bundle`, `expected`, `hourly_actual`).
- Web: follow the insight watch actions (`features/insight/actions.ts`) for the action shape and refresh.

## Approaches considered
- **Reuse `tb_suggestion`:** rejected. It is per home, with a text body, so guests of the same demo home would share
  one plan.
- **Freeze on read:** rejected. Days pass unseen when nobody opens the page across a refit.
- **New table, frozen hourly by the job (chosen).**

## Areas of concern
1. **σ: checked.** House 5, last 22 days: raw daily kWh σ is 6.1, and the in-sample residual σ is 4.1. The model
   keeps out-of-sample daily residuals (`Bundle.residuals`, σ 3.4), so those are used, with their mean as bias.
   `mape_ctx` measures cycle-end error, so it does not fit.
2. **Client-sent display fields** (`label`, `kwh`, `amount`, `baseline`, `watts`) affect only the sender's own page.
   They are bounded, not recomputed. Every field the measurement depends on is derived on the server.
3. A home with no tariff has no device advice and no forecast, so the plan page keeps its empty state. Ruling on the
   R1 Minor 6: the spec's "kWh only" was not reachable, because device advice needs a tariff too.
5. σ and bias come from residuals with a live 7-day level; with the level pinned at the start, errors on days far
   from it can be larger (seasonal drift the weather inputs do not explain). The band may be a little narrow late in
   a cycle.
4. The migration runs on the shared dev database, where the api runs with `--reload` on mounted code. Upgrade the
   `_test` database and step it back if the change is parked (memory note).
