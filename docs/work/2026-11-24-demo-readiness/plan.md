# Demo Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (this repo's sdlc `build` role is
> inline; skip its own final review, commit and cleanup: sdlc §3 is the review, committing is the user's call).
> Steps use checkbox (`- [ ]`) syntax for tracking. Style: ponytail (smallest complete change).

**Goal:** Make the scripted demo (docs/demo-video.md §3) run reliably on prod by paying the ten demo-visible debts.

**Architecture:** Small, independent fixes in place: one compose service, two insight detector rules, one copilot
tool, billing cache and hour weighting, three web tiles, the ledger. No new modules, no schema change.

**Tech Stack:** FastAPI + SQLAlchemy async + pytest (backend, tests run in the api container); Next.js 16 Cache
Components + next-intl + Vitest (web); Docker Compose.

**Spec:** [spec.md](spec.md) (requirements R1–R12).

## Global Constraints
- Every figure NILM-derived; certainty as Cao/Vừa/Thấp only, never a % or "vs plug" wording.
- UI copy plain Vietnamese; edit `messages/{vi,en}/*.json` before the TSX that uses a key; both locales.
- Never edit `packages/ui/src/components/{hairline,ui}` directly; never format `alembic/versions`.
- Backend: modules import each other only through `<module>/api.py`; a cycle gets a lazy import in the function.
- Bug fixes: failing test first, seen failing for the expected reason, then `node <sdlc plugin>/hooks/sdlc.mjs fix on`.
- Tests: `docker compose exec -T api pytest -q <path>`; web `pnpm check` (17/17) from wattprint-web.
- Before each edit in apps/dashboard the hook wants `next-mono-base`, `vercel-react-best-practices`,
  `design-system`, `hairline-ui` loaded (or one line on why one does not apply).

## Review Focus
1. Two replays at once (an `exec -d` left from before plus the service): readings must not double — Task 1 checks
   the lock by starting a second copy.
2. An alert first stored by a daily (D1) finding, then a long_run finding worth more the same day: the payload must
   switch to the long_run — Task 3 test 2.
3. A demo event with an open end (`ends_at` NULL) still running: its runs stay out of D2 peers — Task 2 test 2.
4. `explain_usage` at exactly 00:00 local (span zero) and at 00:59 — Task 4 test covers 00:30; add 00:00.
5. Billing cycle day changed to a day after today (cycle start moves to last month): the device cache is gone and
   the next read uses the new end — Task 5 test.

---

### Task 0: Start
- [ ] Note the bases: backend `git rev-parse HEAD` (21fe144, clean); web
  `node ~/.claude/plugins/cache/ai-native-sdlc/sdlc/0.5.7/skills/sdlc/scripts/review-package.mjs --snapshot`
  (docs/demo-video.md is uncommitted). Write both into `review.md` in this folder.

### Task 1: Replay as a service (R1)

**Files:** Modify `wattprint-backend/docker-compose.yml` (new `replay` service after `api`), `wattprint-backend/README.md:32`,
`wattprint-web/docs/demo-video.md` §2 step 1.

- [ ] **Step 1:** Add service `replay`: `build: .`, `container_name: wattprint-replay`, `command: python -m
  scripts.replay_refit`, `restart: unless-stopped`, the api's `DATABASE_URL`, volumes `./dataset:/data`,
  `./app:/code/app`, `./scripts:/code/scripts`, `depends_on: db (service_healthy)`.
- [ ] **Step 2:** Stop the `exec -d` copy: `docker exec wattprint-api pkill -f scripts.replay_refit`; then
  `docker compose up -d replay`; `docker logs --tail 3 wattprint-replay` shows `home 5 +1` lines.
- [ ] **Step 3 (Review Focus 1):** `docker exec -d wattprint-api python -m scripts.replay_refit` then its log/exit
  shows it refused (lock held); readings per minute for one meter unchanged (`count(*)` over the last 5 min ≈ 60).
  If it did not refuse, stop and add the refusal before going on.
- [ ] **Step 4:** `docker restart wattprint-api`; 30 s later `max(ts)` of main readings is still within 10 s of now.
- [ ] **Step 5:** README line 32 → `docker compose up -d replay`; demo-video.md §2 step 1 → "the `replay`
  container is Up".

### Task 2: Demo events out of D2/D3 history (R2)

**Files:** Modify `app/modules/insight/services/device_signals.py`, `app/modules/insight/services/detectors.py:404-427`;
Test `tests/test_device_signals.py`.

**Interfaces:** Produces `outside_events(rows: Sequence[T], events: list[tuple[datetime, datetime | None]]) -> list[T]`
(T has `start_ts`, `end_ts`; keeps rows overlapping no event; `None` end = still running).

- [ ] **Step 1: failing tests** in `tests/test_device_signals.py`:
  `test_outside_events_drops_runs_inside_a_demo_event` (row 10:00–10:30, event 09:00–12:00 → dropped; row
  13:00–13:20 kept) and `test_outside_events_with_an_open_end_drops_later_runs` (event 09:00–None, row next day
  → dropped).
- [ ] **Step 2:** run, see `ImportError`.
- [ ] **Step 3:** implement `outside_events`; in `detectors.py` build `events` once per home from
  `scenarios_between(s, home_id, until - HISTORY, until)` (ops api) with `not sc.train`, and compute
  `past` from `outside_events(rows, events)`; `recent` is unchanged.
- [ ] **Step 4:** `pytest -q tests/test_device_signals.py tests/test_device_anomaly.py` pass.

### Task 3: Keep the stronger alert payload (R3)

**Files:** Modify `app/modules/insight/services/detectors.py` `_upsert` (≈line 322); Test `tests/db/test_alerts.py` (add to it).

- [ ] **Step 1: failing tests** (DB tests, delete their home in `finally`):
  `test_a_weaker_finding_keeps_the_stored_payload` (store excess_vnd 50 000, upsert 20 000 → payload 50 000);
  `test_a_dearer_finding_replaces_it` (then 80 000 long_run → payload signal `long_run`, 80 000);
  `test_a_finding_without_money_still_updates` (no `excess_vnd` on either → updated, today's behaviour).
- [ ] **Step 2:** run, test 1 fails (payload 20 000).
- [ ] **Step 3:** `on_conflict_do_update(..., where=text("coalesce((excluded.payload->>'excess_vnd')::float, 0) >=
  coalesce((tb_alert.payload->>'excess_vnd')::float, 0)"))` — keep the literal `index_where` as is.
- [ ] **Step 4:** pass; `pytest -q tests/db/test_alerts.py tests/test_device_anomaly.py tests/test_usage_anomaly.py` pass.

### Task 4: Wappi explain_usage at midnight, one cycle start (R4)

**Files:** Modify `app/modules/billing/api.py` (export `cycle_start = _cycle_start` from services/bill.py, add to
`__all__`), `app/modules/copilot/services/tools.py:379-405`; Test `tests/test_copilot_tools.py`.

- [ ] **Step 1: failing tests:** `test_explain_usage_today_in_the_first_hour` with `ctx.now` = 00:30 and 00:00
  Asia/Ho_Chi_Minh on a seeded home → `outcome.data["period"] == "today"`, no `"error"`; and
  `test_explain_usage_cycle_start_matches_billing` (cycle day 28, today the 3rd → `from` is the 28th of last month).
- [ ] **Step 2:** run, the first fails with the "no expected-usage model" error.
- [ ] **Step 3:** cycle branch: `start = cycle_start(local.date(), day or 1)` and `prev_start =
  cycle_start(start - timedelta(days=1), day or 1)`; today branch: `span = max(hour - midnight, now - midnight)`
  so the first hour compares minutes so far (same span yesterday).
- [ ] **Step 4:** pass; the ledger line on `_cycle_start` re-implementation is paid.

### Task 5: Drop the device forecast cache on a billing change (R5)

**Files:** Modify `app/modules/billing/services/device_forecast.py` (add `forget(home_id: uuid.UUID) -> None`:
`_CACHE.pop(home_id, None)`), export it from `billing/services/__init__.py` and `billing/api.py` as
`forget_device_forecasts`; `app/modules/home/services/home.py` `update_home` calls it (lazy import) when the patch
sets `billing_cycle_day` or the tariff; Test `tests/test_home_api.py`.

- [ ] **Step 1: failing test** `test_changing_the_cycle_day_drops_the_device_forecast_cache`: put a sentinel in
  `sys.modules["app.modules.billing.services.device_forecast"]._CACHE[home_id]`, PATCH the home's
  `billing_cycle_day` (to a day after today: Review Focus 5) → sentinel gone.
- [ ] **Step 2–4:** fail, implement, pass. Remove the R2 Minor line from the ledger in Task 10.

### Task 6: Device forecast hour weighting and heater end (R6)

**Files:** Modify `app/modules/billing/services/device_forecast.py` (`_compute`, the device's hourly sum from
`hour`; the heater advice block ≈lines 300-320); Test `tests/test_device_forecast.py`.

- [ ] **Step 1: failing tests:** `test_the_running_hour_counts_by_its_rest` (now 18:50, hourly P50 1.2 kWh for
  18:00 → that hour adds 0.2 kWh, as `forecast_bill` weights `hour0`, forecast.py:237);
  `test_heater_advice_stops_at_the_scenario_end` (heater `ends_at` 3 days ahead → saving counts 3 days of hours,
  not the cycle's). Replace `test_heater_advice_counts_every_hour_to_the_cycle_s_end` with
  `test_heater_advice_without_an_end_counts_to_the_cycle_s_end` (ends_at None, today's 24.840 / 14.400 kWh).
- [ ] **Step 2–4:** fail, implement (the hour's weight = minutes left / 60; heater `temps` cut at
  `min(cycle_end, ends_at)`), pass; `pytest -q tests/test_device_forecast.py tests/test_savings_plans.py`.

### Task 7: Web tiles (R7, R8, R9, R10)

**Files:** messages `apps/dashboard/messages/{vi,en}/billing.json` first, then
`features/plan/components/plan-builder.tsx` (meta badge ≈176), `features/billing/components/device-forecast.tsx`
(≈170-200 and ≈323), `features/billing/components/bill-overview.tsx:56-66`,
`features/billing/components/bill-summary.tsx:145-153`; Test `features/billing/__tests__/` where logic is added.

- [ ] **Step 1 (R7):** drop the `Mô phỏng` badge where the device name is shown beside it (plan builder meta,
  device forecast row). Keep the explanation where it is the only one (bill forecast `simulated`).
- [ ] **Step 2 (R8):** key `deviceForecast.noFactor` — vi "Không có yếu tố nào tạo khác biệt đáng kể.", en
  "Nothing made a notable difference."; render it when `d.method === "model" && e.explainable &&
  !e.factors.length`.
- [ ] **Step 3 (R9):** `overview.forecastRange` gains `{kwhLow}`–`{kwhHigh}` kWh beside the ₫ range (vi
  "Khoảng {low}–{high}, tức {kwhLow}–{kwhHigh} kWh"); pass `p.kwh_p10` / `p.kwh_p90` rounded.
- [ ] **Step 4 (R10):** top-tier card `justify-center`; key `billSummary.topTierNote` — vi "Mỗi kWh dùng thêm
  trong kỳ tính giá này.", en "Every extra kWh this cycle costs this much."
- [ ] **Step 5:** `pnpm check` 17/17; open `/dashboard`, `/dashboard/bill`, a device page, `/dashboard/plan` on
  dev at 1440 and 375 px, console clean.

### Task 8: Review loop (sdlc §3)
- [ ] R1 full, `model: opus` (lane L), one package per repo (`review-package.mjs <base>`), spec and plan paths only.
- [ ] One fix pass for Must/Should (each fix: failing test first); Minors to the ledger or rulings in `review.md`.
- [ ] R2/R3 scoped (`--since <snapshot>`, `model: sonnet`) as needed; stop after R3.

### Task 9: Rehearse and time the demo (R12)
- [ ] On dev data (shared DB): `docker compose exec -T api python -m scripts.scenario start --house 5 --name
  echo_run --param device=kettle --param times=30 --hours 1`; poll `/alerts` every minute; record minutes to the
  alert; `scenario stop`. Write the delay into docs/demo-video.md §2 step 5 and §3 scene 5.
- [ ] Walk scenes 2–8 once signed in as a guest; note any break as a finding (back to Task 8's fix pass).

### Task 10: Ledger and handoff (R11)
- [ ] docs/debt.md: move device-ai change 2 and change 3 blocks under Open; move the items paid here under Paid
  with `docs/work/2026-11-24-demo-readiness`; keep the research items Open.
- [ ] Report per sdlc §4: what changed, rounds, rulings, debt added. Commit, push and deploy only when the user
  asks (then: backend `docker compose up -d --build api insight replay`, web `docker compose up -d --build`).
