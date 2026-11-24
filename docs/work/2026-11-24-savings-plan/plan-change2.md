# Plan, change 2: plans on the backend
Spec: [spec-change2.md](spec-change2.md). Build: inline. Bases: web snapshot b06f22262e85, backend snapshot
3ff8a6bbe36d.

| # | Step | Files | Proof |
|---|---|---|---|
| 1 | Table + model | `alembic/.../20261124_c7e2f4a9b158_savings_plans.py`, `insight/models/model_savings_plan.py` | `pytest -m migrations` round trip |
| 2 | Pure helpers: `trained_on`, `day_totals`, `freeze_days` | `insight/services/plans.py` | `tests/test_savings_plans.py` (unit) |
| 3 | `plan_basis`, `create_plan`, `current_plan`, `stop_plan`, `freeze_plans` + routes | `insight/services/plans.py`, `routes/plans.py`, `schemas/schema_plan.py` | API tests (viewer, per person, 409, 422 cases, basis) |
| 4 | Freeze hourly before `refresh_home` | `insight/services/jobs.py` | savepoint + log; covered by the helper tests |
| 5 | Web: schemas, server, queries, actions; remove `store.ts`, client `freeze`, `getExpectedDays` | `features/plan/*`, revert `features/energy/*` | `schemas.test.ts`, `actions.test.ts` |
| 6 | Page and components on server data; refusal copy; statistics link | `plan/page.tsx`, `components/*`, `messages/*/plan.json`, `device-forecast.tsx` | Signed-in run: start (backdated), reload, stop |

Deviation: step 2's helpers were written before their tests (the tests came right after and pass); the API tests
in step 3 were written first and failed first.
