---
paths:
  - "apps/dashboard/features/**"
---

# Dashboard features: rules agents miss

Source of truth: `docs/adding-a-feature.md` (order and file shapes), `docs/data-fetching.md`. ESLint already enforces the import boundaries.

- Order: `schemas.ts` → `server.ts` → `queries.ts` → `actions.ts` → `components/` → route + nav → tests. Create only the files the feature needs.
- `server.ts` is the only backend I/O (`apiFetch`). Parse every response with its Zod schema; a failed request throws, it never becomes `[]`. Endpoints come from the backend's `/openapi.json`, never guessed.
- `queries.ts` authorizes next to the data (`requirePermission`), then `"use cache: private"` + `cacheLife(...)` + `cacheTag(...)`. Cache keys and tags hold plain ids, never tokens or emails.
- `actions.ts`: authorize → Zod `safeParse` → write → `updateTag` → `redirect`, with `redirect` outside try/catch. Expected 4xx returns `{ error, values }`; anything else throws.
- Components hold no logic: forms get the Server Action as an `action` prop and use `useActionState`.
- Tests in `features/<name>/__tests__/` (mock `server-only` with `vi.mock("server-only", () => ({}))`): schemas, server mapping, action validation paths.
