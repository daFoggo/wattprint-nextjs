# Review: plan builder compact
Base: web 0714aab. R1 snapshot: 3e8d14f.

## R1 (sonnet, full) — verdict: fix 1, 2
1. Should: kWh/range/caveat, "full" notice and clarity reason only in tooltips; Hairline Tooltip never opens on touch.
   Fixed: kWh line visible under ₫ (range or "sơ bộ"), "full" as an xs line, hard-to-measure sentence shown, always-on
   hint with its controls. No Tooltip left in the builder.
2. Should: code departed from spec (bar kept, date/button stacked). Fixed: bar dropped per spec; spec updated for the
   stacked date/button and the strikethrough bill line.
3. Minor: badges inside `dl`. Fixed: `dl` holds only the bill row.
4. Minor: earliest start not shown. Fixed: DatePicker hint "Sớm nhất từ {date}." (`summary.startFrom`).
5. Minor: skeleton heights hand-set. Measured on dev: 376/535 px tiles → 286/445.
6. Minor: unused keys `opportunities.saves`, `opportunities.pickUpTo`, `summary.total`, `summary.clearTip` removed.
Added in the fix pass (user request): Tooltip wraps at 16rem (patch.mjs), all tooltips in the app.

## R2 (sonnet, scoped) — verdict: fix 1. Snapshot 500a778.
R1 #1–#4, #6 addressed; #5 not re-checked by the reviewer (measured on dev).
1. Must: tooltip patch had no `patched (hairline/patch.mjs)` marker and no row in docs/design-system.md. Fixed: a
   comment line above the className, a table row.
2. Minor: "short labels look the same" was wrong (pill → rounded-xl). Fixed: the patch's reason says so.

## R3 (sonnet, scoped) — verdict: ship. Snapshot d7628e6.
R2 #1, #2 addressed. Minor: stray blank line in patch.mjs, removed. Re-apply checked: `pnpm hairline` wrote the
patched line, the `to` string is present and the `from` string gone (idempotent).
