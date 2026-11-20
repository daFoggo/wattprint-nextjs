# Review instructions

Read by the sdlc `reviewer` agent before every review of this repo.

## Must fix
- Behavior breaks for a signed-in user in either language (vi, en) or either theme.
- Auth or data: a query or action that does not authorize next to the data, a token or email in a cache key or tag,
  a failed backend request turned into empty data, an action that skips Zod.
- A rule in `.claude/rules/` is broken.

## Should fix
- New logic in `schemas.ts`, `server.ts`, `queries.ts` or `actions.ts` without a Vitest case that fails when it breaks.
- A new route without its Playwright smoke.

## Do not report
- What ESLint, tsc or prettier already enforce (boundaries, arbitrary Tailwind values, weights, icons, navigation imports).
- Vendored code: `packages/ui/src/components/hairline/**`, `packages/ui/src/components/ui/**`. Generated: `.next/`, `next-env.d.ts`.

## Cap
- At most five Minor findings; count the rest.
