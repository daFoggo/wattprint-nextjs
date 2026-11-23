# Review instructions

Read by the sdlc reviewer and by any PR review before every review. Keep it under a page.

## What blocks a merge (Must fix)
- Behavior breaks for a signed-in user in either language (vi, `/en`) or either theme (dark default, light).
- Data or auth: a read or action that does not authorize next to the data, a token or email in a cache key or tag,
  a failed backend request turned into empty data, an action that skips Zod.
- A rule card in `.claude/rules/` is broken.

## Should fix
- New logic in `schemas.ts`, `server.ts`, `queries.ts` or `actions.ts` without a Vitest case that fails when it breaks.
- A new route without its Playwright smoke in `apps/dashboard/e2e/`.
- A runtime read outside `<Suspense>`, or a content fallback that is not a sized skeleton (`next build` catches only some).

## Do not report
- What ESLint, tsc or commitlint enforce: feature boundaries, `server-only` / `use server` / `cacheLife`, barrels,
  arbitrary Tailwind values, weights, shadows, `dark:` color pairs, icon and data-library imports, `next/link` /
  `next/navigation`, per-app fonts, hardcoded JSX text and locales, missing English keys, undeclared env vars.
- Prettier formatting (not enforced; 30 files already drift).
- Vendored: `packages/ui/src/components/hairline/**`, `packages/ui/src/components/ui/**` (review `packages/ui/hairline/patch.mjs` instead).
  Generated: `.next/`, `next-env.d.ts`, `apps/keycloak-theme/src/kc.gen.tsx`, `pnpm-lock.yaml`, the managed blocks in `AGENTS.md`.

## Cap
- At most five Minor findings; summarize the rest as a count.
