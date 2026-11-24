# Review: CI build without a backend
Base: web 029ba02. R1 snapshot 8c738d8.

## R1 (sonnet, full) — verdict: ship
1. Minor: no test pins `await io()` in getDemoHomes.
Ruling: no unit test — CI's `pnpm turbo run build` with no backend is the guard and fails on exactly this — cost if
wrong: a red CI run, no user impact.
