# Debt

Shortcuts and deferred findings. Each entry: what, why it was left, when to pay it.

## Open

- 2026-11-23 (demo sign-in, enabled on the running Keycloak): client `wattprint-web` has Direct Access Grants on, so
  anyone holding its secret (server-side only: dashboard + API env) can password-grant any realm user, and the
  `wattprint-demo-admin` service account (`manage-users`) can edit every user. Left because the demo needs instant
  sign-in as a REFIT home owner now. Pay: replace with a safer flow (e.g. visitors sign up normally and pick a demo
  home to view), then turn Direct Access Grants off and drop the service account.
- 2026-11-23 (debt-watch-status R1 Minor): opening a stored chat that holds a watch widget also reads
  `/insights/watches`; when that read fails the whole chat fails to open (dashboard-data: a failed read throws).
  Pay: if the alerts endpoint is ever down more than the chat, or users report chats that will not open.
- 2026-11-23 (debt-watch-status R1 Minor): the Hairline re-cut brought upstream's canvas plasma `voice-orb.tsx`; voice
  mode passes neither `colors` nor `tone`, so the orb is the fixed "ice" blue in both themes, not checked by eye at
  375/1440 px. Pay: next touch of voice mode (pick `colors` from the chart tokens or a `tone`).
- 2026-11-23 (T03 demo sign-in, wattprint-backend docs/work/2026-11-23-demo-sign-in): every demo visitor signs in as the
  one real owner of the home (no read-only role, no limits, by decision), so a visitor can change that home's
  settings for everyone. Declined for now: separate demo members per visitor (`DEMO_EXTRA_MEMBERS`). The session
  caps are counted per API process (`shortcut:` in `demo.py`). Pay: before the demo is linked from a public page,
  when a visitor breaks it, or when the API runs several workers.
- 2026-11-23 (T03 R3 Minor): `demo.py` `_unlock` reads `access_token` from the admin client's 200 without checking
  the body, so a malformed answer gives 500 instead of 503. Unlikely with Keycloak. Pay: next touch of `demo.py`.
- 2026-11-22 (docs/work/2026-11-22-public-domains): prod (`../wattprint-web-prod`, `next start` 11081/11082) runs as
  detached shells, so a reboot stops it; Keycloak serves the public domain from `start-dev`. Move both to services
  (systemd or containers, Keycloak `start`) when the demo must survive restarts. T02 2026-11-23: not done, it is
  infrastructure on the prod server (out of scope for code work).
- 2026-11-22 (public domains, mobile R1): wattprint-expo dev/preview/production share the `wattprint` scheme, so with
  two variants installed the Keycloak redirect can open the wrong one and sign-in silently returns; fix = a scheme per
  env + matching `wattprint-mobile` redirect URIs. After cutover a dev build without `.env` falls back to the localhost
  issuer (`auth-client.ts:28`) and Keycloak's cookie check likely fails; set `EXPO_PUBLIC_KEYCLOAK_URL`. T02
  2026-11-23: skipped, wattprint-expo is not in this workspace.
- 2026-11-22 (docs/work/2026-11-21-ai-forecast-anomaly, R1 minors and accepted limits; T02 2026-11-23: skipped,
  the forecast module is being worked on by someone else):
  - The usage model loses its backtest on Houses 2 and 5 (MAPE 16.3 % / 7.9 % vs the weekday average's 9.1 % /
    6.9 %); there the bill forecast falls back to the weekday method (`trusted()`). P10–P90 coverage 25–61 %
    against a 72–88 % target. Pay: when the model wins on more homes (weather-normalised level, more NILM history).
  - Weak weather response: a −8 °C cold spell raises 3 days' expectation by ~4 % while the simulated heater adds
    ~13 kWh/day; the 7-day level absorbs the season. Pay: with the item above.
  - NILM backfill was cut (House 2 has 170 older days, House 5 none); `presence` is left out where unknown.
  - `explain_usage` re-implements `_cycle_start` (`tools.py`); "today" between 00:00 and 00:59 says "no model".
  - Bill page forecast note shows the ₫ range without its kWh range (`bill-overview.tsx`).
  - Feedback buttons only on the Overview; mail has no link back.
  - `refresh_home` ~1.7 s per modelled home per hour, run serially in the insight worker: measure before more
    than a few hundred homes have a model.
- 2026-11-23 (docs/work/2026-11-23-device-ai, change 1):
  - Only 5 of 18 device models beat the weekday-hour mean (D1 runs for those); human-driven devices (dishwasher,
    kettle) lose. Pay: with a better device model (run-count features) in change 2.
  - An `echo_run` demo run stays in `tb_device_cycle` as a D2 peer for 60 days, raising that device's P95. Pay:
    exclude runs inside a `train = false` scenario from the peers.
  - A weaker signal later the same day overwrites the stored payload of the device's alert.
  - A run ending between the last analysed time before midnight and midnight is never judged (missed, never wrong);
    during NILM catch-up a whole day can be skipped. Pay: keep a "judged up to" mark per home.

Deliberate scale limits stay as `shortcut:` comments in the code, each with its trigger
(wattprint-backend: SSE polling, per-process copilot and demo sign-in rate counts, pattern-only privacy, hourly
bill recompute, CPU
torch index, on/off thresholds from the NILM bundle; wattprint-web: the Hairline `action-receipt` type exclusion).

## Paid

- 2026-11-23 (debt-watch-status, lane M, R1 ship; docs/work/2026-11-23-debt-watch-status):
  - Alerts v3: a Wappi watch widget in a stored chat shows "Ended" and drops its `#watch-<id>` link once the alerts
    list has that watch as fired, expired or cancelled (read on chat load, only when the chat holds a watch widget).
  - T02 R1 Minors: tests pin the LogStream `timeZone` patch (hairline/log-stream.test.mjs), `getDevice` reusing the
    request's `getDevices` read (energy queries.test.ts) and a 0-spend roommate making a room lone (rooms.test.ts).
  - `pnpm --filter @workspace/ui hairline` passes again: the voice-talk hook anchor re-cut for upstream's `tone` prop.

- 2026-11-23 (T03 debt fixes): the shared demo owner locked by wrong passwords now unlocks itself (the API clears the
  lockout with service account `wattprint-demo-admin` and retries); `/demo/session` answers only the dashboard (its
  client secret) and caps each visitor (5 a minute, by the address nginx saw) under the global 20, so one script no
  longer keeps everyone on 429.
- 2026-11-23 (T02, uncommitted; lane M, R1 ship, lane S for nginx/docs/copy):
  - Alerts v3: `getDevice` reuses the request's `getDevices` and a cached `tips`, so the add button reads
    `/energy/devices` once (7 devices: 8 backend calls, was 15). The per-device read stays as a `shortcut:`.
  - Alerts v3: a broken watch can be cancelled: backend `cancel_watch` ends active or broken rows
    (tests/test_watches.py), the alerts page shows the cancel button on every listed watch.
  - Alerts v3: with under two points of history a money template steps by 1,000 ₫ from the figure now rounded to it
    (templates.test.ts).
  - Public domains: `apply.sh` stops on a failed `nginx -t`; all three sites send `X-Forwarded-For $remote_addr`
    (both domains answer `server: nginx` with no CDN/proxy headers, so nginx is the edge); README/.env.example LAN
    recipe names `API_BIND=0.0.0.0`. Takes effect only after `sudo ./apply.sh` on the nginx host (not this server);
    then check Keycloak logs the real client IP, and a private IP there means a proxy in front: revert to
    `$proxy_add_x_forwarded_for` with `real_ip`.
  - Room spending: when the tile is by device, a lone device in a room is named by the device (rooms.test.ts).
  - Device log: LogStream takes a `timeZone` (patch.mjs feature patch, docs/design-system.md); the device timeline
    passes the home's `Asia/Ho_Chi_Minh`, so server, browser and the rest of the app agree.
  - Device page: with no runs the log subtitle is just "Chạy 0 lần".
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
- 2026-11-22 `apps/dashboard/lib/ajv-browser.ts`: browser stub for `ajv/dist/2020.js` accepts any data (shortcut:
  only avatar-core validates our bundled Wappi character in the client). The alias key matches avatar-core 1.2.1's exact
  specifier; on an avatar-core upgrade, re-grep the client chunks for Ajv codegen, since a changed specifier brings the
  CSP crash back while the config test still passes. (R1 Minor)
- 2026-11-24 (docs/work/2026-11-23-device-ai, change 2, R1 Minors):
  - A device forecast "from now" counts the running hour in full (the bill forecast counts only its rest): at 18:50
    a heater's 18:00 hour is counted again. Pay: weight the first hour like `forecast_bill`.
  - Heater advice prices every hour to the cycle's end, ignoring the heater scenario's `ends_at`.
  - "Vì sao" shows a heading with nothing under it when every factor group is under 500 ₫ (model method).
  - Screen readers hear a day's date and kWh, not its ₫ or P10–P90 range (the bar and the visible figures are
    aria-hidden).
  - The weekday fallback's 4-week history keeps demo-event hours (`echo_run`), which training and the holdout drop.
  - The heater's name reads "Máy sưởi điện (mô phỏng)" beside a "Mô phỏng" badge.
  - `/billing/devices/forecast` is cached per home and hour in each API process (`_CACHE`, shortcut); move it to the
    insight worker's hourly job when there are more than a few dozen homes.
  - That cache only turns over on the hour: after a change of billing cycle day or tariff the device cards keep the
    old cycle end and prices for up to an hour (R2 Minor). Pay: `_CACHE.pop(home_id)` where those settings are saved.
  - The holdout's wiring to `tail_as_of` has no test of its own (the test calls the helper directly). (R2 Minor)
- 2026-11-24 (change 3, explanation, R1 Minors):
  - The usual sums a day's known hours (days with 22+) and keeps demo-event hours; the model's past covers all 24 hours
    of all 28 days, so NILM gaps and scenario windows land in "other". Pay: mask both alike (`excluded_hours`).
  - "Days off" before can be fractional (one holiday in 28 days: 2,25 a week).
  - The sun line's direction comes from radiation alone, while its share also holds cloud cover and day length.
  - The model's past factor shares and level average all 28 days while `model_past` and the usual count measured
    days only: a NILM gap in a cold week moves the temperature share's past and the trend absorbs it. Last week's
    temperature averages all 7 days though the level averages its full-coverage days. Pay: one mask of measured days.
  - The trend line's weather gate (`TEMP_RESPONSE_R`) checks the shape of a device's temperature shares, not their size:
    a device with a tiny but temperature-shaped share can still read "last week was also warmer" (a fact, no cause
    claimed). Pay: also require the implied kWh to reach 5 % of the usual. (R2 Minor)
  - NILM's runs are fragmented and noisy (REFIT dishwashers: ~260 "runs" in 4 weeks, 0.1 kWh each). Advice joins
    pieces within 60 min and ignores joined runs under 300 Wh (`PROGRAM_MIN_WH`, shortcut); change 1's D2 long run
    and D3 odd hour still judge the raw pieces. Pay: join runs into programs once, in `refresh_cycles`.

