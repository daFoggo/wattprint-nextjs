---
name: hairline-ui
description: Use Hairline UI (hairlineui.com, MIT shadcn registry) components in this monorepo. Hairline is the first choice for any UI or motion; shadcn is the fallback. Covers where the components live, how to add or update them from upstream without touching shadcn files, the local patches, the MCP server, theming, and the custom dashboard sidebar. Use when building or changing UI, adding a component, animating something, or updating Hairline/shadcn.
---

# Hairline UI

> **Project convention**
> 1. **Hairline first.** Before writing UI or motion, look for a Hairline component (`packages/ui/src/components/hairline/`, or the `hairline-ui` MCP server: `search_components`, `find_for_screen`, `get_component`). Use shadcn (`components/ui/*`) only when Hairline has no fit, or when the Hairline one cannot do the job (see "Kept on shadcn").
> 2. **Never edit a vendored file** in `components/hairline/` or `components/ui/`. Restyle with tokens in `globals.css`, props, or a wrapper in the app. A change that cannot be made that way goes into `packages/ui/hairline/patch.mjs` (see Patches).
> 3. **Never run the MCP's `get_install_command` output or `npx shadcn add https://hairlineui.com/...` as is.** It writes into `components/` and overwrites shadcn's `button`, `select`, `dialog`…. Install through the project config below.
> 4. Icons in app code stay `@tabler/icons-react`. `lucide-react` is a dependency of `@workspace/ui` only because Hairline imports it; do not import it elsewhere.

## Where things live

| Path | What | Import |
| :--- | :--- | :--- |
| `packages/ui/src/components/hairline/*` | Hairline components + their helpers (vendored, unedited except `patch.mjs`) | `@workspace/ui/components/hairline/<name>` |
| `packages/ui/src/components/hairline/ui-interaction-motion.ts` | Hairline's motion tokens: `EASE_OUT`, `EASE_SETTLE`, `EASE_THROW`, `INTERACTION_PRESS`, `INTERACTION_FOCUS`, `useInteractionReducedMotion`, springs | `@workspace/ui/components/hairline/motion` |
| `packages/ui/src/components/ui/*` | shadcn (`base-nova`), byte-identical to upstream | `@workspace/ui/components/ui/<name>` |
| `packages/ui/hairline/` | The Hairline install config: `components.json` (aliases → `components/hairline`), `items.json` (the installed set), `patch.mjs` (+ test), `package.json` (only so the shadcn CLI accepts the folder) | — |

Installed set (`items.json`): every component of the Buttons, Inputs and forms, Overlays and feedback, Display and navigation, Charts, Data and app UI, and AI and agents groups. Not installed: Blocks, templates, Advanced; Motion and landing only where another component needs it (`text-morph`, `number-roll`, plus `wheel-picker`).

## Add or update

```bash
# add: put "@hairline/<name>" in packages/ui/hairline/items.json, then
pnpm --filter @workspace/ui hairline      # installs/updates the whole set from upstream, then re-applies patch.mjs
git diff packages/ui                      # review what upstream changed
pnpm check && pnpm build
```

- Idempotent: run twice, nothing changes. Shared helpers (`field.tsx`, `floating.ts`, `ui-interaction-motion.ts`…) differ between items only in their first comment line, so overwriting them is safe.
- New npm dependency in an item: add it to `packages/ui/package.json` **and** `packages/ui/hairline/package.json` (the CLI skips installing what the latter lists; it must not run `pnpm add` in that folder).
- New keyframes land in `packages/ui/src/styles/globals.css` (the CLI appends them).
- Type errors: `noUncheckedIndexedAccess` is off in `packages/typescript-config/base.json` because Hairline indexes without guards. `action-receipt.tsx` has an upstream type error and is excluded in `packages/ui/tsconfig.json`; do not import it until upstream fixes it.
- ESLint ignores `src/components/hairline/**` (vendored).

shadcn updates are unchanged: `pnpm --filter @workspace/ui exec shadcn add <name> --diff` from `packages/ui`; `add --all --dry-run` must report every file `skip (identical)`.

## Patches

`packages/ui/hairline/patch.mjs`: exact string swaps on vendored files, each with its reason; `pnpm hairline` runs it after every install (skips what is applied, fails when upstream rewrote the code: re-check the bug there, upstream may have fixed it). `patch.test.mjs` fails if a vendored file is committed unpatched. Current patches: `toast-stack` cached server snapshot, `dropdown-menu` and `popover` portal into the enclosing `<dialog>`, `floating` Escape `preventDefault`. Add a patch only for a real bug that props or a wrapper cannot fix.

Known traps found by the audit (details: `docs/design-system.md`, Hairline patches): components that read the clock while rendering need `<Suspense>` or a passed date (prerender fails otherwise); components with `href` render plain `<a>` (pass `onSelect`/`onClick` + `router.push`); floating parts (`tooltip`, `combobox`, pickers…) open behind a Dialog/Sheet until they get the `dropdown-menu` patch; toasts sit behind an open dialog; `<img>` hits the dashboard CSP for external hosts.

## Theming

Hairline reads the shadcn tokens (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, `--card`, `--muted-foreground`, `--chart-1…5`, `--radius`) and Tailwind's palette (`red-500`, `emerald-500`, `amber-500`) for status. Change the theme in `globals.css`; never in a component. Dark mode is the `.dark` class from `next-themes`.

## API shape

Hairline components take data props, not compound children: `<Dialog title description trigger footer>`, `<DropdownMenu trigger items={[{ id, label, onSelect }]}>`, `<Sheet side title>`, `<Tooltip content>`, `toast.success()` with `<Toaster />` once in the root layout. Read the props in the file header comment or with the MCP `get_component`.

## Kept on shadcn (and why)

| Need | Use | Why not Hairline |
| :--- | :--- | :--- |
| Breadcrumb in the dashboard | `components/ui/breadcrumb` + `next/link` via `render` | Hairline's renders a plain `<a>` (full reload) and string labels only |
| Detail sheet (resizable, three header tiers) | `components/shared/detail-sheet.tsx` over `components/ui/sheet` | Hairline's Sheet has a fixed header and width |
| A link that looks like a button | `linkButton()` from `@workspace/ui-patterns/link-button` | Hairline's `Button` renders only `<button>` |
| Menu rows that must be real links | Hairline `DropdownMenu` + `router.push` in `onSelect` | rows are buttons (no middle click); accept it or use shadcn `DropdownMenu` |

## Dashboard sidebar

Hairline has no sidebar; ours is `apps/dashboard/components/layout/sidebar/sidebar.tsx` (`SidebarProvider`, `Sidebar`, `SidebarTrigger`, `useSidebar`). Desktop: a column that eases between `w-64` and a 48px icon rail (`EASE_OUT`), Cmd/Ctrl+B toggles. Below md: Hairline `Sheet` from the left. It keeps shadcn's `group` + `data-collapsible="icon"` contract, so children use `group-data-[collapsible=icon]:*`. `NavTree` adds a hover surface that glides between rows and rail-only Hairline tooltips.
