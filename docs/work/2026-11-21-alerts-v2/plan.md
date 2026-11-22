# Alerts v2 Implementation Plan

> sdlc `build` inline; TDD per task; no commits until the owner asks. Spec: docs/work/2026-11-21-alerts-v2/spec.md

**Goal:** every alert setting on one page, set on a history chart in ₫, with repeating and device on/off alerts.

## Global Constraints
- Repeat periods: today metrics → next local midnight; cycle metrics → next cycle start; power → +1 h.
- Device events: every 60 s, runs since max(last_checked_at − 15 min, created_at), dedup `watch:{id}:{ts}`.
- MAX_DAYS 365 when repeating, else 90. kWh ↔ ₫ through the cycle's average price, "≈", 0.1 kWh rounding.
- Hairline only; vi first; no edit to the applied Watch migration.

## Review Focus
1. A repeating daily watch fires at 10:00, must not fire again the same day, must fire the next day → Task 2 test.
2. A device already running when its on-watch is created → no alert; the next run → one alert → Task 2 test.
3. NILM writes a run late (inside the 15-min overlap) → still one alert, never two → Task 2 test.
4. No tariff → the builder's daily card falls back to kWh, saving still works → Task 4 test (pure helper).
5. Flipping a device switch twice fast → one active watch at most → Task 3 test (cancel existing before create).

### Task 1: migration + model + schemas (`repeat`, device events)
Files: new `alembic/versions/public/20261121_*_watch_repeat_device_events.py`; `insight/models/model_watch.py`,
`model_alert.py` (kinds); `schemas/schema_watch.py`; tests `tests/db/test_roles.py` unaffected, `tests/test_watches.py`.
Test first: `test_device_event_watch_needs_a_device` (CHECK), POST `{metric: "device_on", device_id}` → 201 with
`repeat: true`.

### Task 2: service: repeat and event checks
Files: `insight/services/watches.py` (`create_watch(repeat=)`, `_check`, `_next_period`, `_events`), `mail.py`.
Tests: `test_repeating_daily_watch_fires_once_a_day`, `test_device_on_alerts_each_new_run_only`,
`test_long_run_alerts_while_running_once`, `test_high_power_run_alerts_once`, device detail `peak_w`/`longest_min`,
`test_late_run_inside_overlap_alerts_once`, `test_repeat_default_end_is_a_year`.

### Task 3: API + copilot tool
Files: `routes/watches.py` (pass `repeat`), `copilot/services/tools.py` (tool params, metric list),
web action `setDeviceEventAction`. Tests: tool saves `device_off` with repeat; action cancels then creates.

### Task 4: web builder, device section, system toggles, list
Files: create `features/insight/components/alert-builder.tsx`, `device-alerts.tsx`, `features/insight/money.ts`
(`dailyCost(days, price)`, `toKwh(vnd, price)`, `withMoney(kwh, price, locale)`), rewrite `watch-list.tsx`, delete
`watch-form.tsx`; alerts page, device page tile, settings page (remove notify + ThresholdTry), messages.
Tests: `money.test.ts` (no price → null/kWh fallback, rounding 0.1), schemas for `repeat`.

### Task 5: verify
Backend full suite + ruff; web check + build; signed in with admin@wattprint.local: set a daily ₫ alert by dragging,
a bill alert, flip a device on/off switch, system toggles save, Settings no longer shows alerts; 1440 dark, 375
light. Then R1–R3.
