# Spec, change 3: plan history, demo plans, UX pass
Intent (user, 2026-11-24): "chưa có cái để phục vụ xem lại lịch sử các kế hoạch đã làm à (phục vụ luôn cả việc với
các tài khoản demo thì show các kế hoạch trước đó)", then fix the dashboard's out-of-step links ("Lập kế hoạch tránh
bậc 3" still old-style), audit the whole UX with laws-of-ux-skills and fix, then run the sdlc review.
Status: approved by delegation ("xử lý đến khi hoàn thiện"). Also carries the plan page's UI rework done since change 2
(status strip, goal card, details tabs, copy). Bases: web snapshot 75fe01a, backend snapshot 58a7696.

## Requirements

**Backend (insight module)**
1. `measure_days(s, home_id, bundle, start_on, days, now)` is taken out of `freeze_plans` unchanged in behaviour
   (pinned `base_7d`/`presence` at the start, ≥ 20 measured hours), so a seed script measures the same way.
2. `GET /api/v1/insights/plans/history` (any member) lists the home's finished plans, newest start first, at most
   12: the caller's own plans and the home owners' plans, where finished means `stopped`, or `active` with
   `end_on` before today. The caller's own active plan is never in it (it is the current one). Each item is the
   plan read plus `stopped_at` and `mine` (false for an owner's plan seen by someone else).
   A demo guest is a fresh account each visit, so the demo history is the demo owner's plans.
3. `scripts/seed_demo_plans.py --house <key> --cycles N` writes the demo owner's plans for the last N ended
   billing cycles, from the data only (no invented figure):
   - actions: the home's device advice as it stood at the cycle's start (`device_forecasts(now=start)`), top 3 by
     amount; `forecast_kwh` from `forecast_bill(now=start)`;
   - the days: a model fitted on the 365 days before the start only (as `scripts/backtest_expect.py`), measured with
     `measure_days`; `sigma`/`bias` from that model's out-of-sample residuals;
   - `status = stopped`, `stopped_at` = the day after `end_on`, `model_version = holdout-<start>`.
   Re-running replaces the owner's `holdout-%` plans of that home. The REFIT household never followed these plans,
   so their verdicts are honest (most read "chưa rõ"); the page labels them as the demo home's sample plans.

**Backend (cont.)**
3b. `GET /api/v1/insights/plans/{plan_id}` (any member) returns one plan the caller may open: their own (any
   status) or a home owner's; 404 otherwise (another member's, another home's, unknown). Declared after the fixed
   paths. Plans stopped before any day was measured (`days = {}`) stay out of the history.

**Web (plan feature)**
4. `getPlanHistory` and `getPlanById` (cache + `requirePermission`, Zod; null on 404, and on 422 for a bad id).
   Routes, as the device pages are built:
   - `/dashboard/plan`: the current plan only; a `PillLink` "Kế hoạch trước đây (N)" beside the title when N > 0.
   - `/dashboard/plan/history`: every finished plan as rows (Tile, `divide-y`), each a link to its page; Hairline
     `EmptyState` when none; "Mẫu" on an owner's plan seen by someone else.
   - `/dashboard/plan/[id]`: its result (BalanceMeter), goal (target ₫, share reached, days measured), the actions,
     the daily chart; previous/next plan chips beside the title (the device page's `DeviceChip`, icon optional);
     `notFound()` when not the user's to open. The breadcrumb names a plan by its dates.
5. Links into the plan page use the dashboard's current link style (`PillLink` on the bill's next-tier alert).
6. UX audit with laws-of-ux-skills (overview, statistics, devices, device, alerts, bill, plan, settings), fixed
   within the design system: copy in plain Vietnamese (alerts, standby, peers, settings, plan), fridge-only advice
   dropped from every device's alert bodies, a device page's anomalies first, device names as real links and the
   month's money on the phone card, open alerts first on a phone, the bill tray's foot grouped, the power chart's
   description, the builder says why the rest grey out at three. Deferred (debt): statistics sections, the bill's
   figure hierarchy, settings location placement, stepper for the cycle day.

## Areas of concern
1. Owners' plans shown to every member of the home: members already see all of the home's data; a plan holds no
   more than that. Real homes rarely have viewers today.
2. The seed's advice at a past `now` uses today's device models (not refit at that date); only the pick and the
   display numbers come from them, the measurement does not.
3. Bias/sigma from a holdout model fitted on fewer days may be wider than the live model's.
4. The breadcrumb reads the plan history on every dashboard page (to name `/plan/<id>`), one more backend call per
   page, as it already reads the devices; a failed read only drops the name.
5. The seed's verdicts over a whole month with inputs pinned at the start may be wider apart than a live plan's
   (House 2: ±150 kWh a cycle); they are what that model says, not tuned.
