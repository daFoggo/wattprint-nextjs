# Review: demo flow, sidebar demo row, fetch at request time

Base: bad894b45fc4b7b8be9336082c66195d9690ba84 (snapshot). R1 package Snapshot: e2440c84c8fc38c8f2629ae10ce2176b2a48ab99.

## R1 (full, sonnet): fix 1
- Should fix 1: pick cookie applied on any sign-in within 10 min → fixed: Google/email sign-in actions delete
  `wp-demo-home`; test "the other sign-in buttons forget a demo pick…" failed first.
- Minor 2 (callback session read inside the outer try), 3 (getDemoHomes for every user), 5 (malformed-cookie test):
  docs/debt.md. Minor 4 (stale comment naming the strip): fixed with 1, it was made stale by this change.
- Not checked by the reviewer, exercised in the running dev app: `io()` in a Route Handler (callback viewed the
  pick), Server Actions (pick/view/switch), `"use cache"` (dialog's homes); callback saw the new token cookies
  (House 5 viewed right after sign-in).

## R2 (scoped, sonnet): ship
- R1-1 addressed; no new breakage. Minor (out of loop): an invalid key in `pickDemoHomeAction` does not clear an
  older valid pick (tampered requests only) — accepted, not logged.
