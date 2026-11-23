---
paths:
  - "apps/dashboard/features/*/store.ts"
  - "apps/dashboard/features/*/components/*provider*.tsx"
---

# Client state (Zustand): rules an agent must not miss

Source of truth: docs/client-state.md §1–§8.

- A store only for client-only state shared by distant client components; never mirror server data (the cache is the cache). URL state stays in `searchParams`.
- Per-provider store factory in `features/<name>/store.ts`, provider in `components/`, mounted in `app/`; never a module-level store.
- Read with one selector per value; never `store.getState()` during render; never in a Server Component.
- A store with user data is keyed by user id (`<Provider key={userId}>`), and a persisted store's `name` includes it.
- Middleware only on the combined store, `devtools` outermost. Never mutate state.
