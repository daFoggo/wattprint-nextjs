# Spec: Alerts v3, what happened, what is watched, add one

Intent: [intent.md](intent.md).
Status: approved. The owner picked direction A and asked to proceed on the agent's proposals ("cứ làm theo tự đề xuất
đến khi xong"). Everything below not quoted in intent.md is the agent's call, marked as such where it matters.
Record: none

## Requirements

The Alerts page (`/dashboard/alerts`) becomes three things, top to bottom, and nothing else on its surface:

1. **Page head.** Title "Cảnh báo", description "Những gì WattPrint đã báo và đang theo dõi cho nhà bạn.", and one
   primary action beside the title: **Thêm cảnh báo**, which opens the add panel (4).
2. **Đã báo (what happened).** The home's alerts, newest first: the existing `AlertList` in its full mode (each alert
   with its time, its words, its figure in ₫ where it has one, its link to the device, the feedback buttons on
   `usage_anomaly`, and acknowledge). Nothing fired: Hairline `EmptyState` (scene `done`).
3. **Đang theo dõi (what is watched).** One list, each row one sentence:
   - first the two automatic alerts the system runs by itself, each with a Switch bound to the home preferences
     `notify_anomaly` ("Dùng điện khác thường so với mọi khi") and `notify_tier` ("Sắp sang bậc giá mới"), tagged
     "Tự động";
   - then each **active** watch the user (or Wappi) set: icon by kind, its sentence ("Báo khi tiền điện cả kỳ vượt
     500.000 ₫", "Báo khi Tủ lạnh chạy quá 30 phút"), a quiet meta line (repeats daily / each cycle / each run; the
     last figure read; when it last fired), and **Xoá** (the existing confirm). Cancelled and ended watches are not
     shown: they are history, and the fired ones already appear in Đã báo.
   - No watch set: the automatic rows stay, followed by an `EmptyState` (scene `inbox`) whose action opens the add panel.
4. **Add panel (`Thêm cảnh báo`).** A right detail sheet (`components/shared/detail-sheet.tsx`), two steps:
   - **Step 1, "Bạn muốn được báo khi nào?"**: a short list of templates in three groups, each a row with an icon,
     a title and a one-line hint. Tiền điện: *Tiền điện một ngày vượt mức* (`today_kwh`, set in ₫ when a price is
     known), *Tiền điện cả kỳ vượt mức* (`bill_vnd`). Thiết bị: *Thiết bị chạy quá lâu* (`device_run_min`), *Thiết bị
     bật lên* (`device_on`), *Thiết bị tắt đi* (`device_off`). Cả nhà: *Công suất cả nhà vượt mức* (`power_w`).
   - **Step 2, the sentence**: the template as one readable sentence with chips the user changes in place, e.g.
     "Báo khi [Tủ lạnh ▾] chạy quá [30 phút ▾]", "Báo khi tiền điện cả kỳ vượt [600.000 ₫ −/+]". Devices are a
     `PillSelect` of the home's devices (not `other`); minutes a `PillSelect` (15, 30, 60, 120, 240); money and watts
     a Hairline `StepperInput`. The default value comes from the home's own history (`lineScale` start: the upper
     quartile). Under the sentence, one plain preview line from the same history: "Với mức này, 30 ngày qua sẽ báo
     N lần" (money, power, device run length); a device on/off rule says how often the device ran in the last 7
     days instead. Money and power rules have a "Báo lại mỗi ngày / mỗi kỳ / mỗi giờ" Switch, on by default; device
     rules repeat per run (backend). Buttons: **Quay lại**, **Lưu cảnh báo**.
   - Saving calls the existing actions (`saveWatchAction`, `setDeviceEventAction`). A refusal shows inside the sheet
     (Hairline `Alert`), since toasts sit behind an open sheet (design-system.md). Success closes the sheet, shows a
     toast, and the new row appears in Đang theo dõi.
5. Removed from the page: the builder cards and its big `ThresholdLine` chart (`AlertBuilder`), the device list with
   switches (`DeviceAlertList`, including the run-limit row added earlier today), and the separate notifications tile
   (`AlertPreferences`), whose two switches move into Đang theo dõi.
6. Unchanged: the Overview's alert list; the device page's own alert tile (`DeviceAlertTile`, on/off switches and
   levels); Wappi setting alerts by chat or voice (its watches show up in Đang theo dõi, `sql` ones with their label).
7. vi and en copy for everything new; ₫ with kWh where a kWh figure is set in money (existing `approxKwh`).

## Design

- Server page (`alerts/page.tsx`) loads in parallel: alerts, watches, devices, the dashboard days, power, bill and its
  history, home settings, and each named device's detail (for its run lengths, the device preview). It renders the
  head with the add button, `AlertList`, and a new `WatchedList` (features/insight) that renders the automatic rows
  and the active watches. The add button and the sheet are one client component, `AddAlert`, given the templates'
  data as props (sources from `alertSources`, the devices with their days, the price) and the two save actions.
- Pure logic goes in `features/insight/templates.ts` (tested): the template list and, per template, the default
  value and the preview count from its history (`previewCount(values, threshold)`: how many history points pass the
  threshold; device run length counts days whose `longest_min` passes it). Components hold no logic.
- `WatchedList` reuses `WatchList`'s sentence and meta formatting (move the shared part, do not copy it); the
  automatic switches call `saveHomeSettingsAction` with only the changed preference, as `AlertPreferences` does.
- The add button sits in `PageHead`'s `action` slot (as the Overview's weather card does).

## Approaches considered

1. **Right detail sheet, two steps (picked).** The page keeps one calm surface; adding is a focused task that opens
   from it and closes back to it, the repo's own pattern for "more than a row".
2. A route `/dashboard/alerts/new` as a full-page wizard: more room, but a navigation away and back for a 20-second
   task, and a second page to keep in step with the first.
3. An inline panel that expands on the page: the page goes back to holding everything at once, which is the problem.

## Non-goals

- Backend changes; snooze, quiet hours, push or a new delivery channel; editing a rule in place (remove and add);
  creating `sql` or `forecast_vnd` watches from the panel (Wappi keeps those); redesigning the device page's tile.

## Anti-goals

- More than one chart on the page; a grid of form fields; every device listed on the page surface.

## Areas of concern

- One device-detail read per named device on page load (about 7 in the demo homes). The agent's call; marked with a
  `shortcut:` comment, to replace with a bulk endpoint when homes have more than ~20 devices.
- Menus inside a sheet: `PillSelect` must open above the sheet (design-system.md lists the Hairline portal patch for
  dropdowns and popovers; verify `pill-select` in the running app).
- `AlertList` full mode shows up to the backend's 20 latest alerts; older ones are out of reach. Enough for a home's
  month at today's alert rates; a "more" link is a later change.
