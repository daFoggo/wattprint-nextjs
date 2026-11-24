# Plan, change 3
Spec: [spec-change3.md](spec-change3.md). Build inline.

1. Backend `services/plans.py`: extract `measure_days`; add `plan_history`. Test first: history filters (own
   stopped, own active-ended, owner's for a viewer, own active excluded, other member's excluded, order, cap).
   Standards: backend conventions (module api, no docstring modules).
2. Backend route `GET /insights/plans/history` + `PlanHistoryItem` schema. Test: API returns `mine` flags.
3. `scripts/seed_demo_plans.py`; run it for 2, 5, 5-heat (3 cycles). Check: rows exist, days filled.
4. Web `schemas.ts` (`PlanHistorySchema`), `server.ts`, `queries.ts` (`getPlanHistory`), Vitest for 404/500.
   Standards: `.claude/rules/ui.md`, i18n.md, data-fetching docs.
5. Web `plan-history.tsx` + page wiring (own Suspense boundary); copy vi/en (JSON before TSX).
6. Bill page link restyle; laws-of-ux audit → fixes (lane S styling unless logic).
7. Verify: backend pytest, web `pnpm check`, signed-in self-test desktop + 375 px; then R1 (opus, both repos).

Departures (user corrections during the build): history moved from an accordion / sheet on the plan page to its
own routes (`history`, `[id]`), the plan page links to it with a pill; `GET /plans/{id}` added; blank plans
(no measured day) left out of the history; the audit's fixes (step 6) touched billing, energy, insight, home copy
and the overview / device pages.
