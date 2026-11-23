---
paths:
  - "packages/ui/**"
---

# Vendored UI: rules an agent must not miss

Source of truth: .agents/skills/hairline-ui/SKILL.md and docs/design-system.md (Updating shadcn and Hairline UI, Hairline patches). The protect hook blocks edits under `components/hairline/` and `components/ui/`.

- A change a token, prop or wrapper cannot make goes into `packages/ui/hairline/patch.mjs` as an exact swap with its reason; every patched line carries `patched (hairline/patch.mjs)`; feature patches go in the doc's table.
- Add or update Hairline: `"@hairline/<name>"` in `hairline/items.json`, then `pnpm --filter @workspace/ui hairline`; review `git diff packages/ui`.
- A new npm dependency of an item goes in both `packages/ui/package.json` and `packages/ui/hairline/package.json`.
- A new visible Hairline string gets a `useHairlineText()` patch and a row in `src/lib/hairline-messages.ts`.
- Do not import `action-receipt.tsx` (upstream type error, excluded in tsconfig).
