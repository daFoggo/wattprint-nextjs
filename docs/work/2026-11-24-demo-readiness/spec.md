# Spec: demo readiness

Intent: [intent.md](intent.md). Status: approved by delegation. Bases: backend 21fe144 (clean), web 7bb2aad plus
uncommitted docs/demo-video.md (snapshot it with review-package.mjs --snapshot).

## Requirements
R1. Replay keeps running across api restarts and host reboots: its own compose service `replay` (api image,
    `python -m scripts.replay_refit`, `restart: unless-stopped`, the api's DB env and the `dataset`/`scripts` mounts).
    The replay's DB lock already stops a second copy. README and handoff say `docker compose up -d replay`.
R2. Device anomaly D2 (long run) and D3 (odd hour) judge a run against history without runs that overlap a demo
    event (`tb_demo_scenario.train = false`); the run being judged is still judged.
R3. An open alert's stored payload is replaced only by a finding worth at least as much (`payload.excess_vnd`,
    0 when absent), so a weaker same-day signal never rewrites it; severity follows the payload it keeps.
R4. Wappi `explain_usage`: the cycle start comes from billing's own cycle start (one implementation);
    `period="today"` between 00:00 and 00:59 says "no whole hour yet" instead of "no model" (amended after R1:
    a half hour against a whole expected hour would read as a false drop).
R5. The device forecast cache for a home is dropped when its billing cycle day or tariff changes.
R6. Device forecast from now counts the running hour by its rest, like the bill forecast; heater advice prices
    only hours before the heater scenario's `ends_at` (an open end: to the cycle's end as today).
R7. Where the device name already says "(mô phỏng)", no "Mô phỏng" badge beside it (plan builder, device forecast).
R8. "Vì sao" never stands alone: with no factor worth showing, one plain line says so.
R9. Bill page forecast note gives the kWh range with the ₫ range.
R10. Overview top-tier card: content centred in its height, with one line on what it means.
R11. docs/debt.md: paid items move to Paid with the change folder; device-ai change 2/3 items back under Open.
R12. Rehearsal: the echo_run kettle scene on REFIT House 5 fires an alert; the measured delay goes into
    docs/demo-video.md §2.

## Areas of concern
- R2 drops history: a home whose only kettle runs are demo runs falls under MIN_PEERS and D2 stays silent (right).
- R3 compares money across signals (daily vs long_run); the detector already keeps the dearest of a day's findings.
- R6 changes figures users see (device ₫, plan advice); the plan's frozen actions keep their stored amounts.
- R1: two replays (an old `exec -d` one plus the service) must not double readings — check the lock before relying.
- Prod deploy restarts api: with R1 the replay no longer dies with it.
