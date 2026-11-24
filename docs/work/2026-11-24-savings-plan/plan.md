# Plan: savings plan
Spec: [spec.md](spec.md). Build: inline. Base: wattprint-web 763598565faa, wattprint-backend 2d8005cd8ea1.

| # | Step | Files | Proof | Standards |
|---|---|---|---|---|
| 1 | Pure math: `billFor`, `adviceRange`, `alwaysOnSteps`, `sigma`, `measurable`, `verdict`, `weeks`, `trainedOn`, `freeze` | `features/plan/math.ts` | `features/plan/__tests__/math.test.ts` fails first, then passes | next-mono-base, rules for dashboard features |
| 2 | Plan schema (Zod; it parses what `localStorage` holds) and a `useStoredPlan` hook (`useSyncExternalStore`, try/catch) | `features/plan/schemas.ts`, `features/plan/store.ts` | Schema test: a bad stored value becomes "no plan" | docs/client-state.md |
| 3 | `getExpectedDays(from)`: `/expected` hours summed per local day | `features/energy/expected.ts`, `features/energy/queries.ts` | `expected.test.ts` gets a `dailyExpected` case | docs/data-fetching.md |
| 4 | Route, nav entry, icon, copy (vi/en) | `config/routes.ts`, `config/navigation.ts`, `nav-icons.tsx`, `messages/{vi,en}/{layout,plan}.json`, `messages/{vi,en}.ts` | typecheck; the sidebar shows it | docs/internationalization.md |
| 5 | Page: a server component that composes billing, energy and home data and passes plain props | `app/[locale]/(dashboard)/(pages)/dashboard/plan/page.tsx` | Open it signed in | docs/routing-and-layouts.md, data-fetching |
| 6 | Client island: opportunities → plan builder → progress with weekly rows | `features/plan/components/*.tsx` | Make a plan in the running app, reload, stop it | design-system, hairline-ui |
| 7 | Links: device advice "Thêm vào kế hoạch", bill forecast "Lập kế hoạch tránh bậc N", Wappi PlanWidget "Mở trang kế hoạch" | `billing/components/device-forecast.tsx`, `bill-overview.tsx` (or its forecast part), `copilot/components/widgets.tsx` | Click each in the app | same |
| 8 | Debt rows: backend plan storage, frozen model per plan, device days limited to the month | `docs/debt.md` | — | sdlc |

Risks:
- `CompareBars` or `StepperInput` may not fit the layout. Fall back to a `Tile` with plain rows.
- Device `days` covers only the calendar month.

Changes during build:
- Step 3: the expected days need ≥20 measured hours (not 24) and come in 7-day windows (8-day API cap).
- Backend (added): `GET /expected` returns `model_version` per hour. Test: `tests/test_expect_api.py`.
- Step 6: the daily chart is `ComboChart` (bars actual, line expected) rather than `CompareBars`, whose change chip
  colours "more" green.
- Step 7: the statistics page's device list is left without a link (its top advice only); the device tile has it.
