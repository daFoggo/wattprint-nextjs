---
name: design-system
description: >
  Visual rules for apps/dashboard and packages/ui (shadcn base-nova theme): colors, typography, the 7-tier spacing
  scale, responsive breakpoints, shadcn base-nova component sizes and motion. Use whenever writing or changing JSX
  classNames, layouts, pages, sections, lists, cards, navigation, footers, theme tokens in globals.css, or adding a
  shadcn component, and whenever the user mentions spacing, padding, margin, responsive, mobile, breakpoint, dark or
  light theme, font, color, or "looks off", even if they do not name the design system.
---

# Base design system

Source of truth: [docs/design-system.md](../../../docs/design-system.md). This file is the quick router; read the doc
section when a case is not covered here.

## Hard rules (check every className you write)

1. Nothing is custom. Everything numeric uses Tailwind's default scale. **No arbitrary values**
   (`mt-[54px]`, `text-[13px]`, `grid-cols-[auto_1fr]`, `rounded-[10px]`).
2. Smallest text is `text-xs`. Weights: `font-normal`, `font-medium`.
3. shadcn components: choose a `size` / `variant` prop. Never set `h-*`, `px-*`, `py-*`, `text-*` on them via
   `className`; layout classes (`w-full`, `mt-*`, `self-*`) are fine.
4. Style through the stock shadcn tokens (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`), never
   hex or `dark:` color pairs. Both themes must work; dark is the default. Errors: `text-destructive`. No custom color
   tokens and no shadows (`shadow-*` is neutralised in `globals.css`).
   **Surface, not lines** (doc §2 Surfaces): page `bg-background` → section plate `rounded-3xl bg-card p-6` (tray of cards:
   `p-2`) with **no border** → card inside it `rounded-xl border bg-background p-4`. Never `border-*` on a page region,
   column or plate; never a plate in a plate. Vendored components keep their own rings; the rule is for layout.
5. `font-serif` exists but is opt-in; do not apply it unless asked.
6. CSS that comes from `vercel-react-view-transitions` (`::view-transition-*`) or `web-design-guidelines`
   (`content-visibility`, `transition`, etc.) must snap to the Tailwind scale and color tokens too; see
7. Never edit a shadcn or Hairline UI component file to restyle it: change a token in `globals.css` or pick a `variant`/`size`/prop.
   That keeps `shadcn add --diff` and `pnpm hairline` updates conflict-free (docs/design-system.md, Updating shadcn and Hairline UI).
8. The brand is green: `primary` = `chart-1` = `oklch(64.48% 0.1488 158.78)`, text on it `primary-foreground` (near-black).
   `text-primary` only for icons and large text in light mode (3.1:1 on white). Fonts load once in `@workspace/ui/lib/fonts`; do not load fonts per app.

## Spacing tier lookup

| Relationship between the two things | Class |
| :--- | :--- |
| Glyph-level (icon/text, list items, dt/dd) | `gap-1.5` / `gap-2` |
| Same group (paragraphs, chip/title/author) | `gap-3` / `gap-3.5` |
| Heading to its content | `gap-5` |
| Blocks inside a section (figure, table, meta) | `gap-8` / `my-8`; `mt-9` above an H3 |
| Section to section | `gap-14` (`max-sm:gap-10`) |
| Page region (nav to content, body to footer) | `pt-20` / `mt-20` (`max-sm:pt-12`) |
| Major break (to related posts, CTA) | `mt-28` (`max-sm:mt-16`) |

Space above a heading is always larger than below it. Put spacing on the parent (`flex flex-col gap-*`), not margins on
children. Separate with space first, a plate (`bg-card`) second; borders only on cards inside a plate.

## Layout and responsive

- Shell: `px-9 max-sm:px-6`; `grid grid-cols-1 lg:grid-cols-12`; rail `lg:col-span-4 lg:pr-10 lg:sticky lg:top-24`;
  content `min-w-0 lg:col-span-8`; prose `max-w-2xl`.
- Mobile-first. Only `lg` changes structure (rail stacks above, TOC hides, nav becomes a burger, rows split into two
  lines). `sm` / `md` / `xl` only adjust gutters, hide extras or tune columns.
- Reflow, never shrink type or truncate titles. Hide in this order: keyboard hint, category, tile/TOC, date.
- List rows: `flex items-start gap-4 py-4` inside a plate, split by `divide-y divide-border`; hover `hover:bg-accent`.
- Anchor targets: `scroll-mt-24 max-sm:scroll-mt-18`.
- `ItemGroup` whose children are not real list items must pass `role="none"` (upstream `ItemGroup` ships `role="list"`).

## Components (Hairline UI first)

**Use a Hairline UI component (`@workspace/ui/components/hairline/*`) before shadcn (`@workspace/ui/components/ui/*`) or hand-rolled motion.** Finding, adding, updating and patching them: `.agents/skills/hairline-ui/SKILL.md`.

| Need | Use |
| :--- | :--- |
| Primary CTA | Hairline `<Button size="lg">` |
| Form / toolbar button | Hairline `<Button>` or `size="sm"` |
| Secondary | `variant="outline"` |
| Link styled as a button | `linkButton()` from `@workspace/ui-patterns/link-button` |
| Copy / theme switch | Hairline `copy-button`; `ThemeToggle` from `@workspace/ui-patterns/theme-toggle` |
| Changing numbers / labels | Hairline `number-roll`, `text-morph` |
| Menus, dialogs, sheets, tooltips, toasts | Hairline `dropdown-menu`, `dialog`, `sheet`, `tooltip`, `toast-stack` |
| Chips | Hairline `badge` |
| Filter tabs | Hairline `tabs` / `segmented-control` |
| Form error / success | Hairline `<Alert tone="danger" title>` / `tone="success"` |
| Breadcrumb | shadcn `Breadcrumb` (Hairline's uses a plain `<a>`) |

Install nothing with a bare `shadcn add https://hairlineui.com/...` (it overwrites shadcn files): use `pnpm --filter @workspace/ui hairline`. shadcn components: `pnpm dlx shadcn@latest add <name>` from `packages/ui` (they land in `components/ui/`). Keep `@tabler/icons-react` as the icon library in app code.

## Navigation

Below `xl` the nav links move into a burger panel under the sticky nav (closes on link, Esc, outside click). In-page
anchors use `scroll-mt-24`; the logo scrolls to `0`.

## Dashboard shell (doc §8)

- Two full-height columns: our `<Sidebar>` (`components/layout/sidebar/sidebar.tsx`) · main `flex-1 min-w-0`, both on `bg-background`
  with no rule between them. The sidebar is a floating plate (`p-2` frame, `rounded-3xl bg-sidebar`) with a `<ColumnHeader>`
  (logo + trigger) on top; the main column has no header bar, just an `h-8 text-sm` breadcrumb row above the page head.
  Theme is chosen in the account panel (Light / System / Dark), not by a header button. Body with `no-scrollbar overflow-y-auto`. No third column: a record opens in a
  detail sheet from the page.
- Logo lives in the sidebar header; below `md` (or with the sidebar collapsed) it shows in the main header next to the `SidebarTrigger`.
- Sidebar body = labelled sections (`config/navigation.ts`), named by content (`Workspace`, `Settings`), never "Tree".
  Header = `SidebarTrigger` + path breadcrumb (no project name) + `ThemeToggle`; no header state, no bare-key shortcuts.
  The menu follows the URL: `NAV_SCOPES` holds one `NavScope` per prefix (the global one plus one per `/<prefix>/<id>`); scoped breadcrumbs start with a menu of siblings (`Crumb.options`). New scope = one entry, no component edits.
  The sidebar collapses to a 48px icon rail (doc § Icon rail): every `NavLink` needs an `icon` name; icons are functional, never decorative.
- Never edit shadcn files in `packages/ui`; compose in `apps/dashboard/components/layout/`.
- Each section is a plain menu: `text-sm` rows with an icon per link, `font-medium text-foreground` (no fill) for the current page,
  max two levels, counts `ml-auto text-xs tabular-nums`. No ASCII tree marks, no tiny mono uppercase labels.
- Detail sheet (doc § Detail sheets): `<Sheet>` + `DetailSheetContent` (fits content, drag the left edge to resize) with three header
  tiers (opens at 42rem, resized by dragging its left edge, width remembered): `DetailSheetHeader` (close, title, copy, Previous/Next as a `ButtonGroup`), `DetailSheetPaneHeader` per pane, then
  `DetailSheetPaneBody`. Open state, width and selection stay inside the sheet (`RecordProvider`); compound parts, no boolean
  props (vercel-composition-patterns). Trees follow shadcn File Tree: `Collapsible` per node + ghost `Button` rows; hover
  `bg-muted`, selected `bg-primary/10`, chevron `aria-expanded:bg-transparent`. Never animate a size (width, max-width): slide with transform/opacity only; no `backdrop-filter`; memoize provider values.
  List rows elsewhere: selected `bg-primary text-primary-foreground`.
- Metrics are a `dl` row, no stat cards. One focal accent per screen.
- Logo: always `<AppLogo variant size />` (doc § Logo): a home drawn as a wiring diagram (apex = meter, three lines down to green device dots), static, ink follows the theme; sizes 16/24/32/256px only.

## Type and motion

- Page titles `text-2xl md:text-3xl font-medium tracking-tight`; prose `text-lg leading-relaxed text-muted-foreground`; group labels
  `text-sm text-muted-foreground`; nav `text-sm font-medium`. `font-mono` only for code and technical values.
- Transitions: colors `duration-150`, movement `duration-200 ease-out`; guard with `motion-safe:`.

## Before you finish

Grep your diff for `-[` inside classNames, `text-[`, hex colors and `h-`/`px-` on shadcn components. Check the page at
375px, 768px, 1024px and 1440px in both themes, with no horizontal scroll.
