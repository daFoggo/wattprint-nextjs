---
paths:
  - "apps/dashboard/features/*/store.ts"
  - "apps/dashboard/features/*/components/*provider*.tsx"
---

# Client state: rules agents miss

Source of truth: `docs/client-state.md`.

- Zustand only for client-only UI state shared across distant client components, never for server data.
- A per-provider store factory in `features/<name>/store.ts`, its provider in `components/`, mounted in `app/`. Never a module-level store; never read in a Server Component.
