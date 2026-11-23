@AGENTS.md

# Working guidelines

Adapted from the four principles in [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)
(MIT) and tuned for this repo. They favor caution over speed; for trivial edits (typos, renames) use judgment.

## 1. Think before coding
- State assumptions. If a request has several readings, surface them instead of silently picking one.
- If a simpler approach exists, say so. If something is unclear, stop and ask.
- Unknown backend/auth contract? Read the OpenAPI (`/openapi.json`) or the docs first; do not guess endpoints.
- Next.js in this repo is not the version you remember: read `node_modules/next/dist/docs/` before writing Next code (see AGENTS.md).

## 2. Simplicity first
- Write the minimum code that solves the request. No unrequested features, no single-use abstractions, no speculative config.
- Create only the feature files a feature needs (`features/README.md`). Do not extract to `packages/` without a second consumer.
- No error handling for cases that cannot happen; do handle the ones that can (a failed request throws, it never becomes `[]`).

## 3. Surgical changes
- Touch only what the request needs. Match existing style; do not reformat or refactor neighbours.
- Remove imports/functions that *your* change orphaned; only mention unrelated dead code.

## 4. Goal-driven execution
- Turn the task into a verifiable goal and a short plan with a check per step.
- "Done" means verify passes; UI/auth changes are also exercised against a running app (dev servers: web 11091, dashboard 11092).
- Report what was and was not verified. Never claim a flow works if only its error path was tried.

## Commands
- Verify (the Stop hook runs it; ~35 s cold, seconds when turbo-cached):
  `pnpm check && diff -rq --strip-trailing-cr .agents/skills .claude/skills && cmp apps/dashboard/i18n/routing.ts apps/web/i18n/routing.ts`
  Healthy: `Tasks: 17 successful, 17 total` and no output from `diff`/`cmp`.
- One file: `pnpm exec eslint --max-warnings 0 <file>` from its package (the check hook runs this after each edit).
- CI only: `pnpm turbo run build --affected` (`next build`; needs `KEYCLOAK_CLIENT_SECRET`, any value). Run it yourself only when
  asked, never while it could clash with the running dev servers. Local only: `test:e2e` and `test:e2e:instant` (CONTRIBUTING.md).

## Process (sdlc plugin)
- Every change goes through the `sdlc` skill (lane S/M/L). Lane L artifacts: `docs/work/<date>-<slug>/`; debt: `docs/debt.md`.
- `.claude/sdlc.json` lints each edit, blocks vendored UI (`packages/ui/src/components/{hairline,ui}`), bans npm/yarn and
  killing shared processes, and runs verify on Stop. `.claude/rules/` cards load per path; reviews read `REVIEW.md`.

## Git
- Conventional Commits (commitlint enforces it). Do not add co-author or "generated with" lines to commits or PRs.
- Commit or push only when asked.
