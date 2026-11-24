# Review: skeletons at real size, NILM accuracy per device, NILM-only guard

Bases: wattprint-web 720c27bc… packaged --since 9262fa5; wattprint-backend 0272134… packaged --since 7ce636e.

## R1 (full, sonnet)
Packages /tmp/sdlc-review-9262fa5-43d0b9e.md, /tmp/sdlc-review-7ce636e-1380628.md. Verdict: fix 1, 2.
1. Ruling: `responsive-dialog.tsx` "reformat" — the file now equals HEAD exactly (`git diff HEAD` empty); the
   package compares against the snapshot that held the earlier prettier rewrap, so the revert reads as a change —
   cost if wrong: none, there is no diff to ship.
2. Ruling: `scripts/scenario.py` `device_minutes` (and `tests/test_scenarios.py`) — not part of this change: both
   files were modified at 13:57:50 UTC by someone else (another session or the user), not by this work; left
   untouched and reported to the user — cost if wrong: the demo echo_run change ships unreviewed here.
3. Minor: no test for `device_scores`. Fixed: a DB test (the home's active model's sidecar read; a model without a
   sidecar gives none).

## R2 (scoped, sonnet)
Packages /tmp/sdlc-review-43d0b9e-d3f3500.md, /tmp/sdlc-review-1380628-174fe5a.md. Verdict: ship; R1 items addressed,
requirement 3's revision (level only, row marks) checked. Minor fixed: the `device_scores` DB test now deletes its
homes (models cascade); 6 rows left by earlier runs removed from the test database.
After R2, from the running app: React "unique key" warning on the statistics page (elements made inside `.map` for
`extras`, and the device mix's marks): keyed by device id; console clean on both pages. Tooltip copy reworded per
level on user feedback.
