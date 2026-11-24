---
paths:
  - "apps/dashboard/**/*.tsx"
  - "apps/web/**/*.tsx"
  - "apps/keycloak-theme/src/**/*.tsx"
  - "packages/ui-patterns/**/*.tsx"
  - "packages/ui/src/styles/**"
---

# UI: rules an agent must not miss

Source of truth: docs/design-system.md (§1–§10) and .agents/skills/design-system, hairline-ui. ESLint already bans arbitrary values, extra weights, shadows/blur, `dark:` color pairs, lucide and hardcoded text.

- Hairline UI (`@workspace/ui/components/hairline/*`) first; shadcn only where Hairline has no fit (breadcrumb, detail sheet).
- Never set `h-*`, `px-*`, `py-*` or `text-*` on a Hairline/shadcn component via `className`: pick `size`/`variant`; layout classes are fine.
- Surface, not lines: page `bg-background` → plate `rounded-3xl bg-card p-6` with no border → card `rounded-xl border bg-background p-4`. No plate in a plate, no border on a region or column.
- Theme tokens only (no custom color tokens, no theme edits in a component; tokens live in `globals.css`). Both themes must work.
- Spacing from the tier table, as `gap-*` on the parent. Mobile-first; only `lg` changes structure. Reflow, never truncate titles.
- Motion: transform/opacity only (never animate width), `motion-safe:`, colors `duration-150`.
- Designed, not listed (user correction, repeated): every empty state is Hairline `EmptyState`, never a bare `<p>`;
  a device row carries `DeviceIcon`; a key figure gets a visual form (magnitude bar, `BalanceMeter`, `Progress`,
  `NumberRoll`) and a level (one hero figure, supporting figures smaller, detail muted). A new page is designed
  first (hallmark, app-screen scope), then built.
- Progressive disclosure and hierarchy (user correction, repeated): a tile shows the one answer it exists for; the rest
  waits behind a Hairline `Tooltip` / `HoverCard` / `Popover` or the record's own page, never as extra columns, badges
  or text in every row. Two figures side by side must cover the same period, or say which period each covers. An
  action that matters is a button (`linkButton`), never a muted `CardLink` lost in a line. Design first: the need,
  then the Hairline parts, then build.
- Before done: 375/768/1024/1440 px in both themes, no horizontal scroll.
