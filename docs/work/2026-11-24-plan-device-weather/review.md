# Review: a plan's device results against the device's weather-aware expectation

Bases: wattprint-backend ae835f1057a9769bb254935a03b31cef943a6234 (snapshot), wattprint-web
597692cb456ff6865dc7ee36da8113f1a97a7f2d (snapshot).

Checked on real data before review: REFIT House 5's planned dishwasher and kettle have no trusted model (they keep
the usual-before comparison); in the heater demo home the heater, washer and dishwasher do. A 5-heat guest plan on
the heater (start moved to the 23rd for the test, then deleted) froze the 23rd at expected 13.73, actual 11.22 kWh;
the 21st and 22nd stayed out (17 NILM hours). The page read "Thực tế 11,22 / Dự kiến 13,73 kWh/ngày" at 1440 and
375 px (no horizontal scroll).

## R1 (full, opus)
Backend package snapshot e967fa3; web package snapshot 2b2a273.

Web, verdict fix 1:
1. Should: week chips did not say their basis (weather-aware expectation or the usual before), and a device's can
   change between weeks. Fixed: each chip ends with "so với dự kiến" / "so với trước đây" from `deviceVs().weather`.
2. Minor: `devices` required in the web schema breaks the plan page on an older backend. Fixed by the deploy order,
   now in `docs/handoff.md` § Deploy order (backend first, worker restarted); the debt entry for it is removed. Kept
   strict (the rule: a contract change fails loudly).
3. Minor: one-chip-a-device had no test. Fixed: `plannedDevices` in `math.ts`, tested.
Ruling: "Từng việc" shows the same device result under both heater actions — each row is its action; the device's
numbers under each are what that action is judged by — cost if wrong: one repeated pair of bars.

Backend, verdict ship; Minors fixed:
1. A filter that did nothing before `freeze_days`: removed.
2. NILM lagging at the freeze lost a day's devices for good: a plan with device actions now waits for NILM's
   checkpoint to pass the day, at most `NILM_WAIT` (2 days), then freezes without them (`nilm_final`, tested with
   the checkpoint table and with a lagging checkpoint in the freeze test).

## R2 (scoped, sonnet)
Backend packages `--since` e967fa3 (snapshot c886bcd), web `--since` 2b2a273 (snapshot b061462). All five findings
addressed; verdict ship. Its Minor (nothing tested the end of the NILM wait) fixed: a third case, NILM down for 10
days, freezes the days past the wait and holds the rest. Loop closed at R2.
