# Review: statistics money tiles

Base: wattprint-web 720c27bc3cc55e287e7023944d147deac0925f1b, packaged --since 3120892 (Change C's last snapshot).

## R1 (full, sonnet)
Package /tmp/sdlc-review-3120892-d08e1e7.md (snapshot d08e1e7). Verdict: fix 1, 2.
1. Should fix: `billing.forecast.amount` / `.kwh` orphaned. Fixed: removed in en and vi (copilot reads its own
   `copilot.widgets.forecast.kwh`).
2. Should fix: tier labels truncated on narrow segments. Fixed: no truncate; a segment under 15 % shows its number.
3. Minor: the ring lost its centring without rows. Fixed: `justify-self-center` when alone.
4. Minor: `tierColor` value import after the type import. Fixed.

## R2 (scoped, sonnet)
Package /tmp/sdlc-review-d08e1e7-9e34bbd.md. Verdict: ship, all four addressed. Its note (a >= 15 % label may overflow at 375 px) checked in the 375 px pass.
