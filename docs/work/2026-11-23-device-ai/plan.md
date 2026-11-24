# Device AI, change 1 (device anomaly): Implementation Plan

Spec: `docs/work/2026-11-23-device-ai/spec.md` §2 (and §3.2's backtest, which D1 needs). Change 2 gets its own plan.
Bases: backend `7baf2d0` (main), web `3a1ec5e` (feat/alerts-v3-and-ui-fixes). No commits until asked.

## Global constraints
- Backend conventions (AGENTS.md, memory): module layout, `api.py` between modules, hand-written migrations in
  `alembic/versions/public`, uuid7, grants + `tests/db/test_roles.py`.
- Device figures from NILM estimates up to `analyzed_until` only; the simulated heater exception is change 2.
- Thresholds (config): D2 P95 and ×1.5 median, ≥ 8 comparable runs; D3 < 3 % of 60 days; D4 +20 % for ≥ 3 days at
  ±3 °C; min impact 2 000 ₫; one `device_anomaly` per device per local day.
- vi first, en complete; Hairline; both themes.

## Review focus
1. A device with too little history (new home, House 5 before backfill) stays silent, never guesses (Tasks 3, 4).
2. Minutes NILM still rewrites (after `analyzed_until`) are never judged (Task 4).
3. A run that spans midnight or starts before the 60-day window is compared once, on its start day (Task 3).
4. One alert per device per day across signals; another device's alert the same day is separate (Task 4).
5. Feedback "not an anomaly" on one device's alert widens only that device and signal (Task 5).

### Task 1: 60 days of runs
- `insight/services/cycles.py`: `KEEP = 65 days`; first pass also fills older runs when the oldest stored run is newer
  than `until - KEEP` (insert-only, `ON CONFLICT DO NOTHING` keeps it idempotent).
- Test `test_refresh_cycles_fills_back_to_keep` (pure helper `since_for(oldest, newest, until) -> datetime`).

### Task 2: Device expectation models (D1's band; reused by change 2)
- Migration: `tb_expect_model.device_id uuid NULL FK tb_device CASCADE`; unique `(home_id, device_id, version)` via
  `COALESCE`; active index per `(home_id, COALESCE(device_id, 0))`.
- `expect/services/device.py`: `device_actual(s, device_id, lo, hi) -> pd.Series` (hourly kWh from
  `device_estimate_1h`, NaN where NILM has not analysed), `device_frame(...)` = home `feature_frame` with `base_7d`
  replaced by the device's own 7-day mean, `train_device(s, home_id, device_id, now) -> str | None` (≥ 28 full days;
  weekly like the home model), and its holdout check stored in `metrics.backtest = {mae_model, mae_base, coverage,
  days}` on the last 14 days (baseline: same weekday-hour mean of the 4 weeks before), `trusted_device(b) -> bool`
  (model MAE < baseline MAE), `device_band(s, home_id, device_id, lo, hi) -> (actual, p10_sum, p50_sum, p95_sum)`.
- `expect_train` job trains devices after the home (types except `other`).
- Tests: `test_device_frame_uses_the_devices_own_level`, `test_device_backtest_beats_or_not` (synthetic).

### Task 3: Signals (pure functions in `insight/services/device_signals.py`)
- `daily_excess(actual, p50, p95, price, factor) -> dict | None` (D1; like wave 1 `judge`).
- `long_run(run, peers, factor) -> dict | None` (D2): peers = runs of the device in the last 60 days starting in the
  same 4-hour block with start temperature ±3 °C; needs ≥ 8; fires when duration and energy > P95 and ≥ 1.5× median.
- `odd_hour(start_hour, days_run_at_hour, days) -> dict | None` (D3): < 3 % of ≥ 28 days, ≥ 20 runs in total.
- `denser_cycling(recent_ratio, past_ratio) -> dict | None` (D4): recent 3 days vs 28–56 days ago at ±3 °C, ≥ +20 %.
- Each returns payload `{signal, value, usual, unit, excess_kwh?, excess_vnd?, context}`.
- Tests: one firing and one silent case per signal; too few peers / days → None; a run spanning midnight counts on its
  start day.

### Task 4: Detector, settling, kind
- Migration: `tb_alert.kind` CHECK adds `device_anomaly`.
- `detectors._device_anomalies(s, home_id, until, now) -> list[Finding] | None`: per device (not `other`) read runs from
  `tb_device_cycle` (`end_ts ≤ until`), weather at run starts (`weather_inputs`), D1 band from Task 2 when
  `trusted_device`, pick the strongest signal per device (by ₫, then D3), `dedup_key =
  device_anomaly:{device_id}:{local date}`, impact ≥ 2 000 ₫ for D1/D2/D4.
- `settle_devices` like `settle_usage`: today's stay, earlier days resolve. Replaces `longer_than_usual` (its rule kind
  drops from `rule_kinds`).
- Tests: `test_one_alert_per_device_per_day`, `test_unanalysed_minutes_are_not_judged`,
  `test_silent_without_history`.

### Task 5: Feedback per device and signal; mail; Wappi
- `feedback.sensitivity(s, home_id, kind, device_id=None, signal=None)` counts `not_anomaly` verdicts on alerts of that
  device and signal (join `tb_alert`); used as the factor in D1/D2/D4 and to widen D3's 3 % to 1.5 % per verdict.
- `mail.alert_text` per signal (vi); Wappi `alerts` passes `signal`.
- Test `test_feedback_widens_one_device_only`.

### Task 6: Demo scenario `echo_run`
- `scripts/scenario.py start --house 5 --name echo_run --param device=washing_machine [--param times=2]`: picks the
  device's most recent typical run from `tb_device_cycle`, takes the main readings of that window minus the window's
  minimum, and adds them from now (`times=2`: twice back to back = a long run). Applied by the replay (scenarios.py).
- Test `test_echo_adds_the_run_shape_from_now`.

### Task 7: Web
- `features/insight/schemas.ts`: kind `device_anomaly`; `alert-list.tsx`: copy key `device_anomaly.<signal>` and the
  feedback buttons for it; messages vi/en per signal.
- Device page (`devices/[id]`): tile "Bất thường gần đây" = the home's alerts for that device (`AlertList` with the
  device's alerts, feedback on).
- Tests: schema parses each signal; copy keys exist in vi and en.

### Task 8: Verify
- Backend suite + ruff; web `pnpm check`, `pnpm build`; `echo_run` live on House 5 → D2 alert after NILM settles;
  signed in: Overview, device page, feedback; review R1 (sdlc:reviewer).
