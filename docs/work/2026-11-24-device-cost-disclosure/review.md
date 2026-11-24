# Review: cost by device, forecast on demand

Base: wattprint-web 720c27bc3cc55e287e7023944d147deac0925f1b, packaged --since 9e34bbd.

## R1 (full, sonnet)
Package /tmp/sdlc-review-9e34bbd-45f096b.md (snapshot 45f096b). Verdict: fix 1.
1. Should fix: "simulated" no longer shown. Fixed: certainty tooltip and hover card say so (`simulatedNote`).
2. Minor: marks had `aria-label` without a role. Fixed: `role="img"`.
Declined, recorded: a failed forecast read takes the whole tile (spec: as before); title "month" vs hint "cycle":
fixed anyway, the tile now says "this cycle" throughout.

## R2
The fixes were reviewed inside docs/work/2026-11-24-forecast-tile-and-card-links (package --since 45f096b, its
requirement 4): addressed, verdict ship.
