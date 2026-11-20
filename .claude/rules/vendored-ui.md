---
paths:
  - "packages/ui/**"
---

# packages/ui: rules agents miss

Source of truth: skill `hairline-ui`, `docs/design-system.md` (Updating shadcn and Hairline UI, Hairline patches). A hook blocks edits to `components/hairline/` and `components/ui/`.

- Add or update Hairline: `packages/ui/hairline/items.json`, then `pnpm --filter @workspace/ui hairline`; review `git diff packages/ui`.
- A bug that props or a wrapper cannot fix goes into `packages/ui/hairline/patch.mjs`, listed in the patches table, each patched line commented `patched (hairline/patch.mjs)`.
- shadcn: `pnpm --filter @workspace/ui exec shadcn add <name> --diff`; `add --all --dry-run` must report every file identical.
