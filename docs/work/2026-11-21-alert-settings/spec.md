# Spec: Set and manage alerts by hand or through Wappi
Intent: docs/work/2026-11-21-alert-settings/intent.md. Status: approved (owner asked to proceed, 2026-11-21).
Record: none

## Requirements

Backend (wattprint-backend `app/modules/insight`, `app/modules/copilot`):
1. `POST /insights/watches` (member of the home) with body `{metric, op, threshold, label, device_id?, ends_on?}`:
   `metric` one of `bill_vnd, bill_kwh, forecast_vnd, today_kwh, power_w, device_kwh_today` (not `sql`: a custom
   query goes through Wappi); `op` `gt|lt`; `label` 1–200 chars; `ends_on` a date. It calls the existing
   `create_watch` and returns `201` with `WatchRead` plus `value_now: Decimal | None`.
2. `WatchError` → `409` for `already_crossed` (with `extra.value_now`) and `too_many`; `422` for every other code.
   The error `code` is the WatchError code.
3. `WatchRead` gains `device_id: uuid.UUID | None`.
4. The copilot tool `create_watch`, when it saves, adds a widget `{kind: "watch", id, label, op, threshold, unit,
   value: number | null, ends_at}` (ISO datetime). Only on success.

Web (wattprint-web `apps/dashboard`):
5. Route `/dashboard/alerts` ("Cảnh báo" / "Alerts"), in the sidebar's dashboard section after Devices, icon a bell.
   Page head title and a one-line description.
6. The page shows, in this order: the form "Đặt cảnh báo mới" and the list "Cảnh báo bạn đã đặt".
   - List rows: label, condition (`> 1.000.000 ₫`, `< 200 W`), latest value with its time, state badge
     (`active` "Đang theo dõi", `fired` "Đã báo", `expired` "Hết hạn", `cancelled` "Đã huỷ", `broken` "Lỗi"),
     the end date for active ones, and a Cancel button on active ones. A device alert names its device and links
     to its page. Each row has `id="watch-<id>"` so `/dashboard/alerts#watch-<id>` lands on it.
   - Empty list: one line inviting to set one here or ask Wappi, with a link to Wappi.
   - Form: metric (6 choices, each with its unit), device (only for `device_kwh_today`), above/below, threshold
     (number), optional end date. The label sent is the metric's name in the user's language (and the device name).
     The backend's refusal shows under the form in words: already past (with the value now), too many (10),
     no tariff, unknown device, end date passed. Success clears the form and the new alert appears in the list.
7. The device page gets a tile "Cảnh báo cho thiết bị này": that device's alerts (same rows), the form with
   `device_kwh_today` and the device fixed, and a link "Tất cả cảnh báo" to `/dashboard/alerts`.
8. Copilot registry renders `watch`: a card with the label, condition, value now and end date, and a link
   "Xem cảnh báo" to `/dashboard/alerts#watch-<id>`.
9. Alerts are read fresh per request (React `cache`, like `getAlerts`; no private `"use cache"`, which hung with
   the session read, `features/energy/queries.ts`). Create and cancel call `refresh()` from `next/cache` so the
   list re-renders. So an alert Wappi saved is on the page when its card's link opens it. *Builder's call.*
10. Overview's alert feed: a `watch_hit` / `watch_broken` item links to `/dashboard/alerts#watch-<watch_id>`.
    *Builder's call: the two "Cảnh báo" places point at each other.*
11. The form shows the default end when the end date is left empty: "Đến hết kỳ hoá đơn" (bill metrics),
    "Đến hết hôm nay" (today metrics), "30 ngày" (power). *Builder's call, from the backend's defaults.*
12. All copy in vi and en.

## Design
- Backend: route in `insight/routes/watches.py` next to GET and DELETE; body schema `WatchCreate` in
  `schemas/schema_watch.py`; errors raised as the house `ConflictError` / `UnprocessableError`. Follows
  wattprint-backend AGENTS.md and the `fastapi` skill. The copilot widget model `WatchWidget` joins the union in
  `copilot/schemas/schema_widget.py` (the contract from the widgets change).
- Web follows `docs/adding-a-feature.md` order inside the existing `features/insight` slice: `schemas.ts`
  (`WatchSchema`, `WatchCreateSchema`), `server.ts` (`fetchWatches`, `createWatch`, `cancelWatch`), `queries.ts`
  (`getWatches`, React `cache`), `actions.ts` (`createWatchAction` returns `{error, values}` on expected 4xx,
  `cancelWatchAction`, both `refresh()`), components `watch-list.tsx`, `watch-form.tsx`. Device names come from
  `getDevices` (features/energy), passed in by the page. Hallmark app-screen rules apply inside the design system:
  every data region has loading, empty, error and full states; cancel is confirmed; each active "above" alert shows
  a `UsageMeter` of its last value against the threshold. Route page composes them
  (`.claude/rules/dashboard-routes.md`). Devices list for the form comes from `features/energy` through the page
  (features do not import each other). Hairline components first (`.claude/rules/ui.md`, `vendored-ui.md`); new page
  design through the `ui-new` role (hallmark) inside the repo design system, which wins.
- The copilot card lives in `features/copilot/components/widgets.tsx` (registry entry), linking with the house
  `Link`.

## Approaches considered
1. **One alerts page plus a device tile, sharing the list and form components (chosen).** Sense's two entry
   points, one data source and one form, so they never disagree.
2. Alerts only inside each device. Most alerts (bill, power) are not about a device; they would have no home.
3. Alerts inside Settings. Settings is about the home and account; alerts change often and deserve their own page.

## Areas of concern
- Device on/off alerts are left out: they would fire on NILM's estimate (misdetections reach the user), and a
  once-only watch fits "tell me when it passes X", not "every time it turns on". A recurring device-event alert is
  a separate change.
- The uncommitted Watch work and the widgets change are in the same trees; reviews of this change exclude them.

## Open questions carried forward
None.
