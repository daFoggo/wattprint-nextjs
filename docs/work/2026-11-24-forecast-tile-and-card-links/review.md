# Review: bill forecast tile compact, card links

Base: wattprint-web 720c27bc3cc55e287e7023944d147deac0925f1b, packaged --since 45f096b.

## R1 (full, sonnet)
Package /tmp/sdlc-review-45f096b-9262fa5.md (snapshot 9262fa5). Verdict: ship. Minors fixed in this change:
1. The band marker unclamped: `bandPosition` (forecast.ts) clamps to 0–100, the middle for a point; Vitest case.
2. A zero change printed "0%": under half a percent the chip says "Same as last cycle".
3. `responsive-dialog.tsx` format-only rewrap: reverted.
4. `IconLink` copied `CardLink`'s classes: `FOCUS`, `LINK_DOT`, `LINK_ARROW` exported from nav-links and shared.
5. Untested popover maths: covered by (1); the `simulatedNote` join is two strings.
Declined, recorded: tooltip/popover-only figures on touch (spec concern 1).
