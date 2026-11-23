---
paths:
  - "apps/dashboard/app/**"
  - "apps/web/app/**"
  - "apps/dashboard/config/**"
---

# Routes and pages: rules an agent must not miss

Source of truth: docs/routing-and-layouts.md §3, §5, §6 and docs/adding-a-feature.md §6–7. `next build` (CI only) catches some of these; you will not see them in `pnpm check`.

- `app/` only composes: never `await` `cookies()`, `headers()`, `params` or `searchParams` at the top of a page or layout; await them in a child inside `<Suspense>`.
- Suspense fallbacks for content are a sized skeleton, never `fallback={null}`.
- Layouts never authorize; the query does. `proxy.ts` only redirects optimistically.
- A new route: path in `config/routes.ts` (+ `PROTECTED_PREFIXES` if outside `/dashboard`), a `NavLink` with an `icon`, one Playwright smoke in `e2e/`, and the prefix in `apps/web/next.config.ts` rewrites (multi-zone).
- Every parallel-route slot (`@slot`) has a `default.tsx`; `error.tsx` is a Client Component.
- Route handlers live outside `[locale]` and pick the language from `NEXT_LOCALE` (`i18n/cookie-locale.ts`).
