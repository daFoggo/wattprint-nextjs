# Review: copilot delete (lane M)

Base: 56e25d3bf876cec25e3026c0670f0b35e7f21658 (wattprint-web, clean tree)
R1 package: /tmp/sdlc-review-56e25d3-16d86c0.md — Snapshot: 16d86c0d2ce9a9540d072c2b86b4d0aa7a88e8a8 (for the next round: review-package.mjs 56e25d3bf876cec25e3026c0670f0b35e7f21658 --since 16d86c0d2ce9a9540d072c2b86b4d0aa7a88e8a8)

## R1 (sonnet, full) — verdict: ship
- Should fix 1, no test covers Undo / the fold → e2e now does Undo inside the window, then a reload past it (chat stays).
  Ruling: Undo after the fold and unmount during the 360 ms fold get no test — the folded row is collapsed (no clickable
  Undo) and a 360 ms window is not hittable reliably from Playwright; the repo has no DOM unit-test env and adding
  one (happy-dom) for these is a new dependency for one component — cost if wrong: a regression there shows only as
  a chat that comes back after a delete made exactly during the fold.
- Minor 2, bfcache → fixed: the patch comment says a page restored from bfcache has already sent its deletes.
- Minor 3, reload race in the e2e → fixed: `toPass` reloads until the list no longer has the chat.
- Ruling: Minor 4 (a 404 on an already-deleted chat resyncs the list) — resync is the right reaction to any
  divergence from the backend and costs one list request; cost if wrong: one extra request.

## R2 (sonnet, scoped) — verdict: ship
- Should fix 1, Minor 2, Minor 3: addressed; no new breakage.
- Ruling: the 6 s fixed wait in the Undo e2e — the undo window is a fixed 5 s and the page shows nothing when it ends;
  cost if wrong: 6 s more per e2e run.

Verified: e2e/copilot-history.spec.ts failed on prod before the fix (both cases: the chat came back) and passes on the
dev server with it; `pnpm check` 17/17.
