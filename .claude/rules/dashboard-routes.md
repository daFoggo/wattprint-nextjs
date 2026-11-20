---
paths:
  - "apps/dashboard/app/**"
  - "apps/dashboard/config/**"
---

# Dashboard routes and layouts: rules agents miss

Source of truth: `docs/routing-and-layouts.md`, `docs/data-fetching.md` §4–6, `docs/adding-a-feature.md` §6–7.

- Never `await` `cookies()`, `headers()`, `params` or `searchParams` in a page or layout body: read them in a child inside `<Suspense>`.
- Every runtime read sits in `<Suspense>` with a **sized** skeleton, never `null` for content.
- Layouts never authorize (it blocks streaming); queries do. Pages compose `queries.ts`; they never import `server.ts`.
- `"use cache"` always comes with `cacheLife()`. Prefer `await io()` over `connection()`; today's date is `getToday()` (`lib/clock.ts`).
- A new route: constant in `config/routes.ts`, a `NavLink` with an `icon` in `config/navigation.ts`, and one Playwright smoke in `e2e/`. An area with its own menu is a scope (§6.4).
