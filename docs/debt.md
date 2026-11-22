# Debt

Shortcuts and deferred findings. Each entry: what, why it was left, when to pay it.

## Open

- 2026-11-22 (alerts v3, docs/work/2026-11-22-alerts-v3, R1 Minor):
  - The add button reads every named device's detail (`getDevice`, which also re-reads `/energy/devices` and the
    tips) on each alerts page load and after each save: about 15 backend calls for 7 devices. A bulk run-length
    endpoint, or `getDevice` reusing `getDevices`, once homes have ~20 devices.
  - A broken watch (a Wappi `sql` rule that stopped working) stays under "Đang theo dõi" with its badge: the list
    offers no delete for it and the backend's `cancel_watch` only ends active rows. Needs both sides.
  - With under two points of history, a money template steps by 1 ₫ (`templates.ts` fallback). Step by a round
    amount (1,000 ₫ / 10,000 ₫) for new homes.
  - A Wappi watch widget in chat links to `#watch-<id>` even after the watch ended (the widget has no status);
    the Overview and alerts page now link only listed watches (`isWatched`).
- 2026-11-22 (room-spending fix, R2 minor): when the tile is by device, a device alone in a room is still labelled
  by its room (`features/energy/rooms.ts`). Pay: when homes start setting rooms.
- 2026-11-22 (signed-in check): the device log (`LogStream` patch) shows the browser's timezone after hydration,
  the rest of the app the home's (`Asia/Ho_Chi_Minh`); they differ only for a browser outside Vietnam. Pay: when
  a home can be outside Vietnam (format with the app's `timeZone` in the patch).
- 2026-11-22 (empty states, R2 minor): with no runs, the device page's log keeps its subtitle "Chạy 0 lần · mỗi dòng là
  một lần bật đến lúc tắt" above the empty state. Pay: next touch of `devices/[id]/page.tsx` (drop the second half at 0).

Deliberate scale limits stay as `shortcut:` comments in the code, each with its trigger
(wattprint-backend: SSE polling, per-process copilot rate count, pattern-only privacy, hourly bill recompute, CPU
torch index, on/off thresholds from the NILM bundle; wattprint-web: the Hairline `action-receipt` type exclusion).

## Paid

- 2026-11-21 (change D, after docs/work/2026-11-21-alerts-v2):
  - Home settings location card: title left, field right from `md` (`md:grid-cols-3`), like the SettingsForm rows.
  - Hallmark beside the design system: the first real new page (Alerts) was built with Hallmark's app-screen
    rules inside `docs/design-system.md`; the ESLint design rules pass, nothing of Hallmark's theme was imported.
    Keep `ui-new` = hallmark with the repo's design system winning.
  - Wappi chart widget: a null x reads as an empty label; booleans read `true`/`false`; the data step is found
    once; infinities in a table are null (tested); hours over two days carry their day; `AreaChart` takes a `unit`
    (Hairline feature patch, `area-chart.tsx`, listed in docs/design-system.md).
  - Alert settings: the Overview links a watch alert only for its owner (the viewer's own watches); the unit words
    live in one `unitLabel` (minutes from Intl, no hard-coded words).
  - Alerts v2: repeating custom alerts read "daily"; the "tell you again" copy fits days, cycles and hours (web and
    mail); device details carry at least the last 30 days, so levels can be set on the 1st (the month chart filters
    to its month); in-app device on/off alerts show the run's time; `bad_device` has its own words.
  - wattprint-backend `DilatedResidualBlock`: a dilation list other than the trained (1, 2, 4, 8) is refused, not
    silently ignored (tests/test_nilm_block.py; torch runs in the nilm image).
