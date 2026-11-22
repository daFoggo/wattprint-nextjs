# Intent: Dự báo và phát hiện bất thường bằng AI theo ngữ cảnh
Author: project owner. Status: accepted (2026-11-21, "ok đợt 1, 2 và 3 luôn").
Source: conversation 2026-11-21 (BA research; spec.md in this folder).
Record: none

## Problem
Forecast and anomaly detection run on hard-coded rules: the bill forecast is a 28-day weekday mean
(`weekday-profile-v1`), the detectors compare against fixed factors (×1.5, ×1.3 + 50 W, +300 W). Owner: "hiện tại là
đang code cứng tuy nhiên tôi muốn tích hợp AI vào phần này" — when a factor changes (temperature, for instance) the
forecast should change with it, and an anomaly is usage that differs from what the model learned for the same
context, not from a fixed threshold.

## Proposed outcome
A per-home model of expected usage in context (weather, calendar, occupancy inferred from appliances, trends), with
ranges and reasons, behind every forecast, anomaly, M&V and explanation: waves 1–3 of spec.md. Owner: "mục tiêu là
phát triển được các tính năng thật excellent và hữu ích cho user product này".

## Affected users and systems
Every signed-in member of a demo home. wattprint-backend `billing`, `insight`, `energy`, `copilot`, scripts (seed,
replay), migrations; wattprint-web `features/billing`, `features/insight`, `features/energy`, `features/copilot`.

## Constraints
- Direction A: one sensor at the breaker + public data; no indoor sensors (owner, 2026-11-21).
- POC: simulated context data is allowed, labelled (owner, 2026-11-21). Demo homes only (REFIT 2 and 5).
- Weather shown for demo homes is the recording site's history (owner, Q1); the cold-spell scenario injects a
  simulated heater load (owner, Q2).
- Per-device numbers come from NILM output only; whole-home from the `main` series (decision 2026-11-19).
- Delivered as three changes (wave 1, 2, 3), each with its own review loop.

## Open questions
None; the BA calls are listed in spec.md §12b.
