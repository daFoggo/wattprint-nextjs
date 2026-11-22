# Spec: Alerts v2: one place, money first, device on/off, a designed builder
Intent: owner feedback 2026-11-21 on docs/work/2026-11-21-alert-settings ("nhìn phèn", "form là cái méo gì",
"ở cài đặt cũng có cảnh báo, đưa về 1 chỗ", "thêm tiền tương ứng", "Sense cũng NILM mà làm được bật/tắt").
Owner, mid-build: "cảnh báo của sense là dạng khi 1 thiết bị chạy quá ngưỡng thời gian, mức độ thì cảnh báo, chứ ko
phải cảnh báo 1 lần là thôi" → alerts repeat by default; devices get run-length and power-level alerts per run.
Status: approved (owner asked to proceed). Record: none

## Requirements

Backend (wattprint-backend):
1. Migration `public` (new revision): `tb_watch.repeat boolean NOT NULL DEFAULT true`; metric CHECK adds
   `device_on`, `device_off`, `device_run_min`, `device_power_w`; the device CHECK becomes
   `(metric LIKE 'device_%') = (device_id IS NOT NULL)`; `tb_alert.kind` CHECK adds `device_on`, `device_off`,
   `device_long_run`, `device_high_power`. Existing rows keep their behaviour (`repeat` false for them).
2. A repeating watch (`repeat = true`) does not end when it fires: it raises the alert and sleeps until its next
   period — local midnight for `today_kwh`/`device_kwh_today`, the next billing cycle for `bill_vnd`/`bill_kwh`/
   `forecast_vnd`, one hour for `power_w`. Its alert `dedup_key` is `watch:{id}:{period}` so each period alerts once.
   Default end for a repeating watch: 365 days (`MAX_DAYS` 365 when repeating, 90 otherwise).
3. Device run alerts are always repeating, once per run: `device_on` (a run starts), `device_off` (a run ends),
   `device_run_min` (a run, still going or ended, passes `threshold` minutes), `device_power_w` (a run's peak passes
   `threshold` W; peak from `device_estimate_1m.max_w`). Each check (every 60 s) reads the device's runs (`runs()` from
   energy, same noise floor: `MIN_RUN_WH`, `RUN_GAP`) since `max(last_checked_at − 15 min, created_at)` and raises
   one alert per qualifying run, `dedup_key` `watch:{id}:{run start}`, payload `{watch_id, label, device, at,
   value}` (minutes or W for the level alerts). A run that started before the watch was created never alerts.
3b. Device detail (`GET /devices/{id}`) adds per day of the month `peak_w` and `longest_min` (the longest run),
   so the web can draw thresholds over them.
4. `WatchCreate` and `WatchRead` carry `repeat`; `create_watch` takes `repeat`; for device events `op`/`threshold`
   are stored as `gt` / `0` and ignored. The copilot `create_watch` tool accepts the two new metrics and `repeat`.
5. Mail and the Overview feed have copy for `device_on` / `device_off`.

Web (wattprint-web apps/dashboard):
6. Alerts page `/dashboard/alerts` holds every alert setting; Settings loses its notify section and the threshold
   preview (`ThresholdTry`), which move here.
7. Builder (top of the page), Sense-like, no field list:
   - What to watch: a row of choice cards, each with its current figure in ₫ first: "Tiền điện mỗi ngày",
     "Tiền điện kỳ này", "Công suất", and "Thiết bị bật/tắt" (opens the device section).
   - The threshold is set by dragging Hairline `ThresholdLine` over real history, in ₫:
     daily cost = each of the last 30 days' kWh × the cycle's average price (VAT incl.); cycle bill = the last
     cycles' amounts (`getBillHistory`); power = the last 24 hours' hourly peak (W). The header counts how often it
     would have fired. A kWh metric always shows the kWh next to the ₫ (`≈ 18 kWh`).
   - Options: "Lặp lại mỗi ngày/mỗi kỳ" (on by default for every metric), end date only when not repeating. One primary button "Lưu cảnh báo".
   - Saving a ₫ threshold on a kWh metric stores kWh = ₫ / average price (rounded to 0.1 kWh); with no tariff the
     daily card uses kWh only.
8. Device section: each device a row with two Hairline switches "Báo khi bật" / "Báo khi tắt" that save as they
   flip (create or cancel the device_on/off watch). The device page tile (Sense's device alerts) shows the two
   switches plus a choice of "Chạy quá lâu" (ThresholdLine over the daily longest run, minutes), "Công suất quá cao"
   (over the daily peak, W) and "Tốn quá nhiều mỗi ngày" (over its daily kWh × price, ₫), each saved as a
   repeating device watch.
9. System alerts section: Hairline `SettingsForm` toggles `notify_anomaly`, `notify_tier` (moved from Settings,
   same action).
10. The list of alerts set: each a sentence ("Báo khi tiền điện mỗi ngày vượt 54.000 ₫ (≈ 18 kWh), lặp lại mỗi
    ngày"), state badge, meter for active "above" ones, cancel with confirm; device events read "Báo mỗi lần Máy
    giặt bật".
11. Copy vi first, en complete; Hairline components only (no plain stacked inputs); both themes; 375 and 1440 px.

## Design
- Backend follows wattprint-backend AGENTS.md, `docs/database-design-guide.md`, skills `fastapi` and
  `supabase-postgres-best-practices` (constraint changes in a new revision; no edit to the applied Watch revision).
  Event checks reuse `energy.api.runs` over `device_estimate_1m`.
- Web: data loaded on the server (`getDashboard`, `getPower`, `getBillHistory`, `getCurrentBill`, `getDevices`,
  `getWatches`, `getHomeSettings`), composed in the page; client components in `features/insight/components`
  (`alert-builder.tsx`, `device-alerts.tsx`, `watch-list.tsx`); a toggle action `setDeviceEventAction(deviceId,
  event, on)`. The old `watch-form.tsx` is deleted.

## Approaches considered
1. **Threshold on a history chart with money first (chosen):** users see what the alert would have done and read
   ₫, which they understand.
2. Presets only (500k, 1M…): quick but blind to the home's own pattern.
3. Keep the form and add a ₫ hint: the owner rejected the form.

## Areas of concern
- Event latency: NILM writes estimates per window, so an on/off alert can lag the event by the NILM window
  (minutes). Copy says "vừa bật" with the run's own time.
- Price is an average of the running cycle; a tier change makes "≈" drift. Marked with ≈ everywhere.
