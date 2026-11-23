---
paths:
  - "**/package.json"
  - "turbo.json"
  - "**/tsconfig.json"
  - "apps/*/next.config.ts"
  - "pnpm-workspace.yaml"
---

# Monorepo: rules an agent must not miss

Source of truth: AGENTS.md (Monorepo conventions), CONTRIBUTING.md and docs/project-structure.md §6.

- A dependency goes in the package that uses it (`pnpm add x --filter <pkg>`); the root holds only repo tooling. pnpm only.
- No root `tsconfig.json`; no tsconfig `paths` and no `transpilePackages` for workspace packages; import through `exports`.
- Extract to `packages/` only with a second consumer, a different deploy target, or publishing.
- Read the installed `turbo`/`next` docs in `node_modules` before changing their config.
- `EXPOSE_TESTING_API` never on a deploy or CI build.
