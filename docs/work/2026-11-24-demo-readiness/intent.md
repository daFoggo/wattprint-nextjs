# Intent: demo readiness

Record: none. Lane L (backend insight, billing, copilot, home, compose; web billing; several modules, money figures).
Status: approved by the user's request (2026-11-24): "xem chọn các debt có thể giải quyết nhanh và các debt nào để
giúp đạt tới mức có thể giúp demo ổn, xây dựng kịch bản cho video" then "ghi lại thành 1 plan chuẩn để sẵn sàng chạy
theo quy trình 3 plugin sdlc ponytail superpower + skills". Intent and spec written inline (the questions are
answered by the selection in docs/demo-video.md §1); the plan through superpowers:writing-plans.

## Problem
The demo video and live demos run on prod with REFIT replay data. Several visible faults or quiet breakages would
spoil a take: the replay dies with the api container ("Hôm nay 0 ₫", 24/11 16:40 UTC), repeated "kettle left on"
takes raise the kettle's own threshold until the alert stops firing, a weaker signal rewrites a shown alert, Wappi
fails in the first hour of a day, and a few tiles show empty space, a doubled "mô phỏng" or stale numbers.

## Outcome
A rehearsed 7-minute take (docs/demo-video.md §3) runs twice in a row on prod with every scene as scripted; the
debt ledger matches the code (items paid move to Paid, misfiled open items move back to Open).

## Touches
wattprint-backend: docker-compose.yml, README, insight detectors and device signals, copilot tools, billing device
forecast and api, home service. wattprint-web: billing components and messages, docs/debt.md, docs/demo-video.md.

## Constraints
Every figure stays NILM-derived; certainty as levels only (memory show-levels-not-scores). Plain Vietnamese copy,
messages JSON before TSX. Vendored Hairline only via patch.mjs. No prod deploy before the review loop ends.
Commit/push only when the user asks.

## Out of scope (research, docs/debt.md Open)
Home-model accuracy and coverage, weather response, NILM backfill, device models losing to their baseline,
fragmented NILM runs, scale `shortcut:`s.
