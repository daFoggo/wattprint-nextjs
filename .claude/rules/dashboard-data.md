---
paths:
  - "apps/dashboard/features/**/*.ts"
  - "apps/dashboard/lib/**/*.ts"
---

# Dashboard data: rules an agent must not miss

Source of truth: docs/adding-a-feature.md §1–4, §8 and docs/data-fetching.md §4–5, §8. ESLint already checks boundaries, `server-only`, `use server`, `cacheLife` and barrels.

- A failed backend request throws (`apiFetch` → `ApiError`); it never becomes `[]`, `null` or fallback data.
  Exception: the public demo sign-in (`features/auth/queries.ts` `getDemoHomes`) becomes `[]`, logged, so an outage hides only the demo button; its action has no session to authorize (spec docs/work/2026-11-23-demo-sign-in in the backend repo).
- `server.ts` parses every response with the Zod DTO and returns only the fields the UI needs. Unknown endpoint: read `/openapi.json`, never guess.
- Authorize next to the data (`requirePermission` / `verifySession` in the query or action), never in a layout.
- Actions are public endpoints: authorize → Zod-validate → write → `updateTag` → `redirect`.
- Per-user data: `"use cache: private"`. Never a token, email or other secret as a cache argument or tag; use stable ids.
- Prefer `io()` over `connection()`; today's date via `getToday()` (`lib/clock.ts`), never a bare `new Date()` in a cached scope.
- New logic in schemas/server/actions gets a Vitest case in `features/<name>/__tests__/` (`vi.mock("server-only", () => ({}))`).
