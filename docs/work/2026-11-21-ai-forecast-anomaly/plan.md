# AI forecast and anomaly, wave 1: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> No commits until the owner asks (sdlc); the review loop runs after Task 12.

**Goal:** A per-home learned model of expected hourly usage in context, and on it: a bill forecast with a range,
reasons and tier probability (F1–F3, F5), the "usual" line for today (F4), the in-context home anomaly with feedback
(A1, A5/C6), Wappi tools (W1) and demo scenarios incl. the simulated heater (D1). Waves 2 and 3 get their own plans.

**Architecture:** New backend module `app/modules/expect` owns the model: features (weather, calendar, routine
presence, trend) → LightGBM quantile boosters per home → hourly expectations with TreeSHAP contributions grouped by
factor, stored in `tb_expect_hourly`. `billing` (forecast) and `insight` (anomaly) read it through `expect.api`.
Recording-site weather for demo homes is imported once into `tb_home_weather_hourly`; scenarios (heater, D1) live in
`tb_demo_scenario` and are applied by the REFIT replay.

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy async, TimescaleDB, LightGBM (new dependency), pandas/numpy;
Next.js 16 dashboard, next-intl, Zod, Hairline UI.

**Spec:** `docs/work/2026-11-21-ai-forecast-anomaly/spec.md` (wave 1 = §7 "Đợt 1"; decisions §12, §12b).

## Global Constraints

- wattprint-backend AGENTS.md: hand-written Alembic revisions in `alembic/versions/public/` (head today
  `b3d9e5f17a2c`); module layout `models/model_<table>.py`, `repositories/`, `services/`, `routes/`, `schemas/`,
  `utils/exceptions.py`, `api.py`; relative imports inside a module, `app.modules.<x>.api` between modules; no module
  docstrings; uuid v7 keys (`IdMixin`); new tables granted to the app role as in `20261120_6a2f8c1e4b97` and listed
  in `tests/db/test_roles.py` `expected_app`.
- Per-device figures only from NILM output; whole-home from the `main` series (`reading_1h`, coverage
  `covered_minutes`).
- Quantiles `(0.05, 0.1, 0.5, 0.9, 0.95)`; shown range P10–P90; anomaly band P95.
- Eligible for the model: ≥ 28 full days (coverage ≥ 90 %); otherwise `weekday-profile-v1` stays and the UI says
  "ước tính đơn giản theo thứ trong tuần".
- Factor groups (C2), names fixed for API and copy: `weather`, `calendar`, `occupancy`, `trend`, plus `base`
  (model bias) and, in explanations, `used` (actual vs expected) and `unexplained`.
- F2 shows only when |change| ≥ 2 % or ≥ 10.000 ₫. A1 thresholds (config, defaults): excess ≥ 2.000 ₫ over the last
  3 hours or ≥ 5.000 ₫ today; at most one `usage_anomaly` per home per local day.
- Weather inputs: observed for ts ≤ now + 5 days, beyond that the normal (same hour, ±7 days of the same date one
  52-week year earlier).
- Calendar for REFIT homes on the recording's own date (`local day − shift_days`), England bank holidays; UI and
  Wappi say "ngày nghỉ lễ" / "holiday", never the UK name.
- Simulated data is labelled: heater and D1 scenarios carry `simulated` in API responses; D1 windows are excluded
  from training and backtests, the heater is not (the model must learn it).
- Web: vi first, en complete; Hairline components; both themes; 375 and 1440 px; `pnpm check` and `pnpm build`.

## Review Focus

1. A home with a recording gap now (House 2 has one): hours with `covered_minutes < 54` are neither trained on nor
   judged; A1 stays silent over a gap; the forecast still prices the cycle (Tasks 4, 8).
2. Model version changed between yesterday's snapshot and today: no "why it changed" sentence, not a fake one
   (Task 6).
3. Too little data or no tariff: forecast falls back to v1 with `method: "weekday"`, `/expected` returns `[]`, A1
   does not run, nothing 500s (Tasks 5, 6, 8).
4. Local-day boundaries: "today", the cycle and the A1 daily cap are ICT days, while features use the recording's
   date; a check at 23:59 and 00:01 lands on the right day (Tasks 4, 8).
5. Another home's alert: feedback on an alert id of a different home is 404 and changes no sensitivity (Task 8).

## Departures from the spec (decided while planning)

- A1 "do not alert when ≥ 70 % of the excess is explained by weather or calendar": the expectation already
  contains weather and calendar, so anything over its band is by construction what the context does not explain.
  The payload carries `weather_kwh` so the copy can say how much the context raised the bar.
- F4 on the Overview: the Overview has no usage chart. The usual line goes on the Statistics power chart (day
  range), and the Overview gets one sentence in `BillSummary`.
- D1 "reversible": stopping a scenario ends it; readings already stored stay, labelled by the scenario window and
  excluded from training and backtests (readings are insert-only, so un-writing them means a re-seed).
- C6 "can be reset": wave 3 (with U1, the user's context controls); wave 1 caps the widening at ×3.

---

### Task 1: Recording-site weather and scenarios storage

**Files:**
- Create: `wattprint-backend/alembic/versions/public/20261122_<rev>_expect_weather_scenarios.py` (revises
  `b3d9e5f17a2c`)
- Create: `wattprint-backend/app/modules/energy/models/model_home_weather_hourly.py`,
  `wattprint-backend/app/modules/ops/models/model_demo_scenario.py`
- Create: `wattprint-backend/app/modules/energy/services/weather_inputs.py`
- Create: `wattprint-backend/scripts/import_refit_weather.py`
- Modify: `energy/models/__init__.py`, `energy/services/__init__.py`, `energy/api.py`, `ops/models/__init__.py`,
  `ops/api.py`, `tests/db/test_roles.py`
- Test: `wattprint-backend/tests/test_weather_inputs.py`

**Interfaces:**
- Produces: tables `tb_home_weather_hourly(home_id uuid FK CASCADE, ts timestamptz, temp_c, humidity_pct,
  apparent_c, cloud_pct, radiation_wm2, precip_mm real, is_day boolean, PK(home_id, ts))` and
  `tb_demo_scenario(id uuid7, home_id FK CASCADE, name text CHECK IN ('heater','forgotten_load','base_up','away',
  'cold_spell'), starts_at timestamptz NOT NULL, ends_at timestamptz NULL, params jsonb NOT NULL DEFAULT '{}',
  train boolean NOT NULL)`; models `HomeWeatherHourly`, `DemoScenario` exported from `energy.api` / `ops.api`.
- Produces: `async def weather_inputs(s, home_id, lo: datetime, hi: datetime, now: datetime) -> pd.DataFrame`
  (hourly UTC index `[lo, hi)`, columns `temp_c, humidity_pct, apparent_c, cloud_pct, radiation_wm2, precip_mm,
  is_day`; observed ≤ now + 5 d, else normal; `cold_spell` scenarios subtract `params.delta_c` from `temp_c` and
  `apparent_c` inside their window). Exported from `energy.api`.
- Produces: `async def active_scenarios(s, home_id, at: datetime) -> list[DemoScenario]` in `ops.api`.

- [ ] **Step 1: tests** in `tests/test_weather_inputs.py` (insert rows directly with `SessionLocal`, a throwaway
  home): `test_observed_up_to_five_days_then_the_normal` (row at now + 6 d = 30 °C, rows one 364-day year earlier
  within ±7 d at that hour = 10 °C → returned 10.0; at now + 4 d returns its own 30.0);
  `test_cold_spell_lowers_temperature_in_its_window_only` (scenario delta_c 8 → 2.0 inside, 10.0 outside);
  `test_missing_hours_are_nan_not_dropped` (index length = hours in range).
- [ ] **Step 2:** `docker compose exec api pytest tests/test_weather_inputs.py -q` → FAIL (import error).
- [ ] **Step 3:** migration, models, `weather_inputs`, `active_scenarios`; grants; add both tables to
  `expected_app` DML set.
- [ ] **Step 4:** `scripts/import_refit_weather.py --house N`: GET
  `https://archive-api.open-meteo.com/v1/archive` with `latitude=52.7721&longitude=-1.2062`, the recording span
  (`refit.load` first..last wall, padded 1 day), `hourly=temperature_2m,relative_humidity_2m,apparent_temperature,
  cloud_cover,shortwave_radiation,precipitation,is_day`, `timezone=UTC`; map each hour with
  `refit.db_time([...], shift_days)` (shift from `etl.tb_watermark`), upsert into `tb_home_weather_hourly`. No API key.
- [ ] **Step 5:** tests PASS; `ruff check app tests alembic scripts`; `alembic upgrade head` then
  `alembic downgrade -1` then `upgrade head` clean.

### Task 2: Weather card from the stored weather (Q1)

**Files:**
- Modify: `wattprint-backend/app/modules/energy/routes/weather.py`, `energy/services/weather.py`,
  `energy/schemas/` (Weather schema), `wattprint-web/apps/dashboard/features/weather/*` and
  `messages/{vi,en}/*.json` only if the place label needs a key
- Test: `wattprint-backend/tests/test_weather_api.py`

**Interfaces:**
- Produces: `async def stored_weather(s, home_id, now: datetime, lang: str) -> Weather | None` (now = the hour
  containing `now`; next = 8 slots every 3 h; `Sky` icon from cloud/precip/is_day: precip ≥ 0.2 mm → `10`, cloud
  ≥ 70 → `04`, ≥ 30 → `03`, ≥ 10 → `02`, else `01`, suffix `d`/`n`; description from a vi/en dict in the service).
- The route: province set → OpenWeather as today; no province and stored rows → `stored_weather` with `province`
  = "Nơi ghi dữ liệu (Loughborough, Anh)" / "Recording site (Loughborough, UK)"; neither → `HomeLocationUnsetError`.

- [ ] **Step 1: tests** `test_demo_home_weather_comes_from_the_recording_site` (no province, stored rows → 200,
  `now.temp` = the stored hour's value, 8 slots, province label vi); `test_home_without_province_or_rows_is_unset`
  (existing error code unchanged).
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.

### Task 3: Simulated heater, D1 scenarios, one year of history

**Files:**
- Create: `wattprint-backend/scripts/scenarios.py` (pure functions), `wattprint-backend/scripts/scenario.py` (CLI)
- Modify: `scripts/replay_refit.py` (`replay()` applies scenarios), `scripts/seed_demo_homes.py` (creates the heater
  scenario from config), `scripts/demo_homes.toml` (`history_days = 365`, per-home `heater` table),
  `docker-compose.yml` (`NILM_HISTORY_DAYS: ${NILM_HISTORY_DAYS:-365}` on `nilm`)
- Test: `wattprint-backend/tests/test_scenarios.py`

**Interfaces:**
- Produces in `scripts/scenarios.py`:
  - `def heater_w(temp_c: float, local_hour: int, p: dict) -> float`: `p` defaults
    `{"setpoint_c": 16, "w_per_c": 180, "max_w": 2000, "hours": [[6, 9], [17, 23]]}`; inside an hour window
    `min(max_w, w_per_c * max(0, setpoint_c - temp_c))`, else 0.
  - `def apply(rows: list[ReadingRow], scenarios: list[DemoScenario], temp_at: Callable[[datetime], float]) ->
    list[ReadingRow]`: `heater` adds `heater_w`; `forgotten_load` adds `params.watts` (default 800); `base_up` adds
    `params.watts` (default 60); `away` replaces watts with `min(watts, params.base_w)`; `cold_spell` changes only
    weather (via `weather_inputs`), so the heater reacts. Quality unchanged.
- CLI: `python -m scripts.scenario start --house 2 --name forgotten_load --hours 6 [--param watts=800]`,
  `stop --house 2 --name forgotten_load` (sets `ends_at = now`), `list`. D1 scenarios `train = false`; heater
  `train = true`, `ends_at NULL`, `starts_at` = the recording's first db time.

- [ ] **Step 1: tests:** `test_heater_follows_cold_inside_its_hours` (16 °C → 0; 6 °C at 18:00 → 1800; 6 °C at
  13:00 → 0; −20 °C → 2000); `test_apply_adds_forgotten_load_only_in_window`; `test_away_caps_at_base`;
  `test_apply_keeps_quality_and_timestamps`.
- [ ] **Step 2:** FAIL. **Step 3:** implement; `replay()` loads active scenarios once per WINDOW step and the
  heater's temperature from `tb_home_weather_hourly` (with cold-spell offsets). **Step 4:** PASS.

**No existing data is changed (owner, 2026-11-21).** The heater lives in a **third demo home** built from House 5's
CSV and model; Houses 2 and 5 only gain older history:
- `demo_homes.toml`: a home may set `key` (default `str(house)`) and `heater`. New block `house = 5, key = "5-heat",
  model = "house5/nilm_pipeline.pt"`, owner `refit.house5.heat@wattprint.local` ("REFIT House 5 · sưởi mô phỏng"),
  same `devices`, `heater = {}` (defaults above).
- `scripts/refit.py`: `meter(house, key=None)` → `REFIT-H5` / `REFIT-H5-heat`; `source(house, key=None)` →
  `refit/CLEAN_House5.csv` / `refit/CLEAN_House5.csv#5-heat`; `house_of` strips the `#…` suffix;
  `replay_refit.homes()` finds the meter by the serial derived from `w.source` (key aware) instead of the
  `substring(...)` regex. Existing serials and sources stay byte-identical.
- Test: `test_keyed_home_has_its_own_meter_and_source` (5 → `REFIT-H5`, `refit/CLEAN_House5.csv`; 5-heat →
  `REFIT-H5-heat`, `refit/CLEAN_House5.csv#5-heat`, `house_of` → 5).
- Create `scripts/backfill_nilm.py --house N [--days 365]`: runs the home's NILM bundle over
  `[now − days, first existing estimate)` in 1-day chunks with `runner.compute` + `ingest_estimates` (own
  `tb_inference_run` rows, status `ok`), never reading or moving the `nilm` checkpoint; then
  `backfill_aggregates` over that range. Test: `test_backfill_window_stops_before_first_estimate` (pure
  window-planning function `backfill_windows(lo, first_estimate, chunk) -> list[tuple[datetime, datetime]]`).

### Task 4: Features for the expected model

**Files:**
- Create: `wattprint-backend/app/modules/expect/{__init__.py,api.py}`, `expect/services/{__init__.py,features.py,
  calendar.py}`
- Test: `wattprint-backend/tests/test_expect_features.py`

**Interfaces:**
- Consumes: `energy.api.weather_inputs`, `ops.api.active_scenarios`, `reading_1h` / `device_estimate_1h`.
- Produces in `features.py`:
  - `GROUPS = {"weather": ("temp_c", "temp_24h", "temp_72h", "humidity_pct", "apparent_c", "cloud_pct",
    "radiation_wm2", "precip_mm", "is_day"), "calendar": ("hour", "weekday", "holiday"), "occupancy":
    ("presence",), "trend": ("base_7d",)}`; `FEATURES = tuple(f for g in GROUPS.values() for f in g)`.
  - `async def hourly_actual(s, home_id, lo, hi) -> pd.Series` (kWh per hour from `reading_1h`, NaN when
    `covered_minutes < 54`).
  - `async def feature_frame(s, home_id, lo, hi, now) -> pd.DataFrame` (index hourly UTC `[lo, hi)`, columns
    `FEATURES`). `hour`/`weekday` on the home's local clock; `holiday` from `calendar.is_holiday(home's source
    date)`; `temp_24h`/`temp_72h` trailing means; `presence` = share of the same local weekday-hour in the 28 days
    before `now` with a human-activated device on (NILM types `kettle, microwave, toaster, washing_machine,
    dishwasher`, `device_estimate_1h.avg_w ≥ on_w`), i.e. routine, never the hour's own activity (leak rule,
    spec §5); `base_7d` = mean daily kWh of the 7 full local days before the row's day, held at its value on `now`'s
    day for future rows.
  - `async def excluded_hours(s, home_id, lo, hi) -> pd.Series[bool]` (inside a `train = false` scenario window).
- Produces in `calendar.py`: `ENGLAND_BANK_HOLIDAYS: frozenset[date]` (2012–2016), `def source_date(local_day:
  date, shift_days: int) -> date`, `def is_holiday(d: date) -> bool` (bank holiday, or Dec 24 – Jan 1).
  `async def shift_days(s, home_id) -> int | None` (from `etl.tb_watermark` via the home's REFIT meter; None = real
  home → `holiday` 0).

- [ ] **Step 1: tests:** `test_presence_is_routine_not_the_hour_itself` (activity only at the target hour of the
  target day → presence for that hour = share from the previous 28 days, unchanged by the day's own event);
  `test_gap_hours_are_nan_in_actual`; `test_source_date_and_christmas_are_holidays` (shift 4368: local 2026-12-10
  → source 2014-12-25 → True); `test_base_7d_is_held_for_future_rows`; `test_frame_has_every_hour_and_feature`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.

### Task 5: Model, contributions, storage, worker jobs, `/expected`

**Files:**
- Create: `expect/models/{__init__.py,model_expect_model.py,model_expect_hourly.py}`, `expect/services/{train.py,
  predict.py,refresh.py}`, `expect/routes/__init__.py`, `expect/schemas/__init__.py`, migration
  `20261122_<rev>_expect_model.py` (revises Task 1's)
- Modify: `pyproject.toml` (`lightgbm>=4.6` in default deps, `uv lock`), `Dockerfile` (`apt-get install -y
  --no-install-recommends libgomp1`), `app/config.py` (`expect_min_days: int = 28`, `expect_history_days: int =
  365`), `app/main.py` (router), `insight/services/jobs.py` + `insight/worker.py` (jobs), `tests/db/test_roles.py`
- Test: `wattprint-backend/tests/test_expect_model.py`, `tests/test_expect_api.py`

**Interfaces:**
- Tables: `tb_expect_model(id uuid7, home_id FK CASCADE, version text, trained_at, features text[], boosters jsonb
  {quantile: model_string}, residuals real[] (daily P50 residuals, last 60 days, out of fold), metrics jsonb,
  active bool, UNIQUE(home_id, version))`; `tb_expect_hourly(home_id, ts, p05, p10, p50, p90, p95, c_weather,
  c_calendar, c_occupancy, c_trend, c_base real, model_version text, PK(home_id, ts))`. Shortcut comment on the
  plain table: `shortcut: plain table, not a hypertable; at >1M rows convert with create_hypertable`.
- `train.py`: `QUANTILES = (0.05, 0.1, 0.5, 0.9, 0.95)`; `@dataclass Bundle(version: str, features: tuple[str, ...],
  boosters: dict[float, lgb.Booster], residuals: list[float])`; `def fit(X: pd.DataFrame, y: pd.Series, *, seed=7)
  -> Bundle` (objective `quantile`, `alpha=q`, 300 rounds, `num_leaves=31`, `min_data_in_leaf=20`; residuals from
  a time-ordered 80/20 split refit); `async def train_home(s, home_id, now) -> str | None` (None when < 28 full
  days; trains on full local days before today, excluding `excluded_hours` and NaN targets; version
  `ctx-v1-<YYYYMMDDHH>`; deactivates older).
- `predict.py`: `def predict(b: Bundle, X: pd.DataFrame) -> pd.DataFrame` (columns `p05…p95` monotone — sort per
  row — and `c_<group>` = sum of the P50 booster's `pred_contrib` over the group, `c_base` = its bias column).
- `refresh.py`: `async def refresh_home(s, home_id, now) -> int` (rows for `[today − 70 d, cycle_end + 1 d)`),
  `async def expected(s, home_id, lo, hi) -> pd.DataFrame` (reads `tb_expect_hourly`),
  `async def active_bundle(s, home_id) -> Bundle | None`.
- `expect.api` exports `GROUPS, QUANTILES, Bundle, active_bundle, expected, feature_frame, hourly_actual,
  predict, refresh_home, train_home`.
- Jobs: `Job("expect_train", 86_400, jobs.expect_train)`, `Job("expect", 3600, jobs.expect_refresh)`, both through
  `each_home`.
- Route `GET /expected?from=&to=` (max 8 days; `CurrentHome`): `list[ExpectedHour{ts, p10, p50, p90, kwh: float |
  None}]`, `[]` without an active model.

- [ ] **Step 1: tests (model):** synthetic 60 days where `y = 1 + 0.1 * max(0, 16 − temp) + 0.5·[18 ≤ hour < 22]` +
  noise: `test_quantiles_ordered_and_cover` (P10 ≤ P50 ≤ P90 everywhere; 70–90 % of holdout y inside P10–P90);
  `test_contributions_add_up` (`c_base + Σ c_* ≈ p50` within 1 %); `test_cold_hours_owe_their_rise_to_weather`
  (mean `c_weather` at 4 °C > at 18 °C); `test_train_home_needs_28_full_days` (27 → None).
- [ ] **Step 2: tests (API):** `test_expected_returns_hours_for_the_members_home`,
  `test_expected_is_empty_without_a_model`, `test_expected_rejects_more_than_8_days` (422).
- [ ] **Step 3:** FAIL. **Step 4:** implement; rebuild images (`docker compose build api insight`). **Step 5:**
  PASS; ruff; upgrade/downgrade clean.

### Task 6: Bill forecast with range, tier probability, reasons, accuracy (F1, F2, F3, F5)

**Files:**
- Modify: `billing/services/forecast.py`, `billing/schemas/schema_bill.py`, `billing/routes/bill.py`,
  `insight/models/model_forecast_snapshot.py`, `insight/services/jobs.py::_snapshot`, migration
  `20261122_<rev>_snapshot_range_drivers.py` (adds `kwh_p10, kwh_p90 numeric(12,3) NULL, drivers jsonb NULL` to
  `tb_forecast_snapshot`)
- Test: `wattprint-backend/tests/test_forecast.py`, `tests/test_billing_api.py`

**Interfaces:**
- Consumes: `expect.api.active_bundle, expected`.
- Produces: `def cycle_end_draws(kwh_now: float, p50_days: list[float], residuals: list[float], draws: int = 2000,
  seed: int = 7) -> np.ndarray` (bootstrap: each draw adds, per remaining day, `p50_day + residual` sampled with
  replacement; today counts its remaining share).
- `Forecast` dataclass and schema gain: `method: Literal["context", "weekday"]`, `model_version: str`,
  `kwh_p10, kwh_p50, kwh_p90, amount_p10, amount_p90: Decimal` (weekday method: all = `kwh`/`amount`),
  `next.probability: float | None` (share of draws ≥ `from_kwh`; None for weekday), `change: Change | None`
  where `Change(amount: Decimal, parts: dict[str, Decimal])`, parts keys ⊂ `used, weather, calendar, occupancy,
  trend, unexplained`, `accuracy: Accuracy | None` where `Accuracy(source: Literal["backtest", "cycle"], error_pct:
  float, cycles: int)`, `simulated: list[str]` (active scenario names).
- `kwh` / `amount` keep meaning P50 (or v1), so current callers (`_tier_near`, Wappi) keep working.
- Snapshot stores `kwh_p10/kwh_p90` and `drivers = {"groups": {group: kWh over the remaining days},
  "expected_daily": {iso_date: p50_kwh}, "version": model_version}`.
- `change`: vs the latest snapshot of the previous local day with the same `version`; `used` = actual kWh of the
  days between − that snapshot's `expected_daily` for them; group parts = today's − its group sums; ₫ at today's
  average price (`amount / kwh`); `unexplained` = the remainder; None when versions differ, no snapshot, or below
  the F2 threshold.
- `accuracy`: a closed cycle with a mid-cycle snapshot (closest to the cycle's middle) → `cycle`; else the active
  model's `metrics.backtest` (Task 7) → `backtest`; else None.
- Fallback: no active model or < 28 days → today's v1 path with `method = "weekday"`.

- [ ] **Step 1: tests:** `test_draws_center_on_p50_and_spread_with_residuals`; `test_tier_probability_is_share_of_
  draws_over_the_tier`; `test_change_splits_into_used_and_weather` (snapshot yesterday groups weather 10 kWh,
  today 14 kWh, used +1 kWh at 3.000 ₫/kWh → parts weather 12.000, used 3.000); `test_no_change_when_version_differs`;
  `test_weekday_fallback_without_model` (`method == "weekday"`, p10 == p90 == kwh); API:
  `test_forecast_returns_range_and_method` (shape keys present).
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS (existing `test_project_*` still pass).

### Task 7: Backtest script (C1 acceptance)

**Files:**
- Create: `wattprint-backend/scripts/backtest_expect.py`
- Test: `wattprint-backend/tests/test_backtest_expect.py`

**Interfaces:**
- `def score(rows: list[tuple[float, float, float, float]]) -> dict` over `(actual_end, v1_end, ctx_p50_end,
  in_band)` → `{"mape_v1", "mape_ctx", "coverage", "points"}`.
- Script `python -m scripts.backtest_expect --house 2 [--days 182]`: weekly origins over the last `--days`; at each
  origin train on data before it (excluding D1 windows), then for every day of the following week forecast the
  cycle end with actual-to-date (v1 via `project`, ctx via Task 6's path); prints the table and writes
  `metrics.backtest = {mape_v1, mape_ctx, coverage, points, ran_at}` to the active model. Billing cycles from the
  home's `billing_cycle_day`.

- [ ] **Step 1: test** `test_score_mape_and_coverage` (two rows with known numbers → exact values).
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. Running it on the real homes happens in Task 12.

### Task 8: In-context home anomaly and feedback (A1, A5, C6)

**Files:**
- Modify: `insight/services/detectors.py`, `insight/models/model_alert.py` (`usage_anomaly` in `ALERT_KINDS`),
  `insight/services/mail.py::alert_text`, `insight/routes/alerts.py`, `insight/schemas/schema_alert.py`,
  `app/config.py` (`anomaly_min_vnd_3h: int = 2000`, `anomaly_min_vnd_day: int = 5000`)
- Create: `insight/models/model_alert_feedback.py`, `insight/services/feedback.py`, migration
  `20261122_<rev>_usage_anomaly_feedback.py` (kind CHECK + `tb_alert_feedback(alert_id uuid PK FK CASCADE, home_id
  FK CASCADE, user_id FK CASCADE, verdict text CHECK IN ('useful','not_anomaly'), at timestamptz DEFAULT now())`),
  `tests/test_usage_anomaly.py`
- Modify: `tests/db/test_roles.py`

**Interfaces:**
- `async def _usage_anomaly(s, home_id, now) -> list[Finding] | None` (None: no active model or no expectations
  for the window). Windows: last 3 complete hours, and today so far. An hour counts only with coverage ≥ 54 min
  (`hourly_actual`); a window with any NaN hour is not judged. Fires when `actual > Σp50 + factor·(Σp95 − Σp50)`
  and `(actual − Σp50) × avg_price ≥` the window's ₫ threshold; `factor = sensitivity(...)`.
- Finding: kind `usage_anomaly`, `dedup_key = f"usage_anomaly:{local_date}"`, severity `warning` (or `info` when
  `activity_ratio ≥ 1.5`), `device_id` = the NILM device with the largest kWh over its mean for the same local
  weekday-hour of the last 28 days (None if none positive), payload `{excess_kwh, excess_vnd, expected_kwh,
  actual_kwh, hours, activity_ratio, weather_kwh}` (`weather_kwh` = Σ `c_weather` of the window: how much the
  context itself already raised the expectation).
- `detect()`: `usage_anomaly` replaces `unexplained_load` for a home with an active model (old check skipped);
  open `usage_anomaly` alerts are resolved only when their date is before today (not by absence), so a day keeps
  one.
- `feedback.py`: `async def record_feedback(s, home_id, user_id, alert_id, verdict) -> bool` (False: not this
  home's); `async def sensitivity(s, home_id, kind) -> float` = `min(3.0, 1 + 0.5 × not_anomaly verdicts in 90 d)`.
- Route `POST /insights/alerts/{alert_id}/feedback` body `{"verdict": "useful" | "not_anomaly"}` → 204; 404
  `alert_not_found` for another home's id. `AlertRead` gains `feedback: Literal["useful","not_anomaly"] | None`
  (the caller's own).
- Mail copy (vi): subject "Điện dùng cao bất thường hôm nay", body "Từ {start} nhà dùng hơn mức thường {excess_kwh}
  kWh (≈ {excess_vnd} đ), dù thời tiết và lịch như dự kiến." + device line when set.

- [ ] **Step 1: tests:** `test_fires_when_actual_exceeds_band_and_money` (expected rows p50 1.0/p95 1.3 per hour,
  actual 2.0 × 3 h at 3.000 ₫/kWh → finding, excess_kwh 3.0, excess_vnd 9000); `test_silent_under_money_threshold`;
  `test_silent_over_a_gap_hour`; `test_one_per_day_after_acknowledge` (second detection same day updates, no new
  row; after local midnight a new one); `test_feedback_widens_band` (one not_anomaly → factor 1.5 → same actual no
  longer fires at p95 1.3 when actual 1.4); `test_feedback_on_other_homes_alert_is_404`;
  `test_old_rule_skipped_with_model`; `test_no_model_keeps_the_old_rule_and_no_usage_anomaly`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS; existing insight tests pass.

### Task 9: Wappi tools (W1)

**Files:**
- Modify: `copilot/services/tools.py` (`bill_forecast` data, new `explain_usage`, registry), copilot system prompt
  if it lists tools
- Test: `wattprint-backend/tests/test_copilot_api.py` (or `test_copilot_tools.py` if tools are tested apart)

**Interfaces:**
- `bill_forecast` data adds `kwh_range: [p10, p90]`, `amount_vnd_range: [p10, p90]`, `next_tier.probability`,
  `change` (parts in ₫), `method`, `accuracy`, `simulated`; `method` text "contextual model (weather, calendar,
  routine)" or the old weekday text.
- `async def explain_usage(ctx, period: Literal["today", "week", "cycle"]) -> Outcome`: actual vs Σp50 for the
  period, and vs the previous period of equal length: `{actual_kwh, expected_kwh, previous_actual_kwh,
  change_kwh, parts_kwh: {weather, calendar, occupancy, trend, unexplained}}` where parts = Σ c_group(current) −
  Σ c_group(previous) and `unexplained` = change − Σ parts; `tier="estimated"`, `sources=["meter", "weather",
  "model"]`, error data when no model.
- Registry description: `"explain_usage": "Why usage was high or low: actual vs the model's expectation and the
  change from the previous period split by weather, calendar, routine and trend."`

- [ ] **Step 1: tests:** `test_explain_usage_parts_sum_to_change`, `test_explain_usage_without_model_says_so`,
  `test_bill_forecast_carries_range`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.

### Task 10: Web: forecast range, reasons, tier probability, accuracy (F1, F2, F3, F5)

**Files:**
- Modify: `apps/dashboard/features/billing/{schemas.ts,forecast.ts}`, `features/billing/components/{bill-forecast.
  tsx,bill-overview.tsx,bill-summary.tsx,tier-ladder.tsx}`, `messages/{vi,en}/billing.json`
- Test: `apps/dashboard/features/billing/__tests__/forecast.test.ts` (and schemas test if present)

**Interfaces:**
- `ForecastSchema` adds the Task 6 fields (`method`, `model_version`, `kwh_p10/p50/p90`, `amount_p10/p90`,
  `next.probability`, `change`, `accuracy`, `simulated`); `forecastConfidence` keeps working for `weekday`.
- `export function changeSentence(f: Forecast): { amount: number; top: string; parts: [string, number][] } | null`
  in `forecast.ts` (null under the F2 threshold; `top` = the largest |part|).
- Copy (vi): range "Cuối kỳ khoảng {low}–{high} ({kwhLow}–{kwhHigh} kWh)"; method "Dự báo bởi mô hình theo thời
  tiết và lịch của nhà bạn" / weekday "Ước tính đơn giản theo thứ trong tuần"; change "{up, select, true {Tăng}
  other {Giảm}} {amount} so với hôm qua: chủ yếu {top}"; parts words `used` "hôm qua dùng khác dự kiến",
  `weather` "thời tiết những ngày tới", `calendar` "ngày nghỉ, ngày lễ", `occupancy` "nếp sinh hoạt", `trend` "xu
  hướng gần đây", `unexplained` "yếu tố khác"; tier "Khoảng {pct} khả năng sang bậc {tier} (từ {kwh} kWh), có thể
  vào khoảng {date}"; accuracy "Thử trên {cycles} kỳ: lệch trung bình {pct}" / cycle "Kỳ trước lệch {pct}";
  simulated badge "Có tải sưởi mô phỏng". en equivalents.
- Range shown in `BillForecast` (Statistics), `BillOverview` (Bill), `BillSummary` (Overview, one line);
  probability in `TierLadder`.

- [ ] **Step 1: tests:** schema parses a context and a weekday payload; `changeSentence` null under 2 %/10.000 ₫,
  picks the largest part.
- [ ] **Step 2:** `pnpm --filter dashboard exec vitest run features/billing` → FAIL. **Step 3:** implement.
  **Step 4:** PASS; `pnpm check`.

### Task 11: Web: the usual line today (F4), anomaly copy and feedback (A1, A5)

**Files:**
- Modify: `features/energy/{server.ts,queries.ts,schemas.ts}` (fetch `/expected`),
  `features/energy/components/power-chart.tsx` (accepts `usual?: Point[]` per range, passed as TrendChart
  `previous` with `previousLabel` "Thường lệ"), statistics page `Power` (day range gets today's expected P50 ×
  1000 W), `features/billing/components/bill-summary.tsx` (Overview sentence "Hôm nay đang {higher|lower} thường
  lệ {pct} (≈ {amount})" from today's actual vs Σp50), `features/insight/{schemas.ts,server.ts,actions.ts}`
  (`usage_anomaly` kind, `feedback`, `sendAlertFeedbackAction(id, verdict)` with Zod), `features/insight/components/
  alert-list.tsx` (two buttons for `usage_anomaly`: "Đúng, cảm ơn" / "Không phải bất thường"; after: "Đã ghi nhận,
  WattPrint sẽ ít báo kiểu này hơn cho nhà bạn"), `messages/{vi,en}/{insight,energy,billing}.json`
- Test: `features/insight/__tests__/feedback.test.ts`, `features/energy/__tests__/expected.test.ts`

**Interfaces:**
- `ExpectedHourSchema` = `{ts, p10, p50, p90, kwh: number | null}`; `fetchExpected(token, from, to)`.
- `usage_anomaly` copy (vi): title "Hôm nay nhà dùng hơn mức thường {excess_kwh, number} kWh (≈ {excess_vnd,
  number} đ)", body "So với một ngày như hôm nay (thời tiết, lịch, nếp sinh hoạt), {hours} giờ qua cao hơn dự kiến."
  + when `weather_kwh > 0`: "Thời tiết đã làm mức thường cao hơn {weather_kwh, number} kWh, phần vượt nằm ngoài
  phần đó." + device line from `device`.
- `sendAlertFeedbackAction` validates `{id: uuid, verdict: enum}`; an expected data error (404) is swallowed like
  `acknowledgeAlertAction`.

- [ ] **Step 1: tests:** schema parses `usage_anomaly` with `feedback`; action rejects a bad verdict; expected
  series maps P50 kWh to W.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS; `pnpm check`.

### Task 12: Data, training and verification

- [ ] **Nothing is deleted** (owner, 2026-11-21). `docker compose build api insight && docker compose up -d api
  insight`; `alembic upgrade head`.
- [ ] `python -m scripts.seed_demo_homes` (365 days: Houses 2 and 5 only gain older readings, their stored shift is
  kept; the new `5-heat` home is seeded whole with the heater scenario); `python -m scripts.import_refit_weather`
  for `2`, `5`, `5-heat`; `python -m scripts.backfill_nilm --house 2` and `--house 5`; restart `replay_refit`;
  recreate `nilm` with `NILM_HISTORY_DAYS=365` (only the new home has no checkpoint, so only it starts a year back);
  wait until every home's estimates reach now. Check the row counts of the two old homes for the last 90 days are
  unchanged before and after.
- [ ] `insight` trains (`expect_train`) and refreshes; `python -m scripts.backtest_expect --house 2` and `--house 5`:
  record `mape_v1`, `mape_ctx`, `coverage` in this plan's notes and the PR.
- [ ] Backend: `docker compose exec api pytest -q`, `ruff check app tests alembic scripts`.
- [ ] Web: stop dev servers, `pnpm check`, `pnpm build`, `rm -rf apps/dashboard/.next/dev`, relaunch.
- [ ] D1 live: `scenario start --name forgotten_load --hours 6` → `usage_anomaly` within an hour on Overview and
  in Mailpit; `cold_spell` (delta 8 °C) → forecast rises, F2 names weather, no `usage_anomaly`; stop both.
- [ ] Signed in as `refit.house5@wattprint.local` (Playwright, vi and en, light and dark, 375 and 1440): Overview
  sentence, Statistics forecast range + reasons + usual line, Bill tier probability + accuracy, alert feedback
  buttons, weather card shows the recording site; Wappi "Vì sao tháng này tiền điện cao?" calls `explain_usage`.
- [ ] Review loop R1 (sdlc:reviewer) with the package from the base commits (backend `290d5b4`, web `0f49b11`
  after the alerts-v2 work is committed).
