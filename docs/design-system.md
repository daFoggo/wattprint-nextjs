# Design system

How `apps/dashboard` looks and behaves: color, type, spacing, responsive layout, components and motion. The theme is
shadcn `base-nova` with the stock shadcn tokens, nothing custom. Every value is Tailwind's default scale. Tokens live in
`packages/ui/src/styles/globals.css`, components in `packages/ui/src/components` (shadcn, style `base-nova`).
The landing page (`apps/web`) and the dashboard are the live reference for this guide; when they disagree with this file, fix whichever is wrong.

---

## 1. Rules that never bend

1. **Nothing is custom.** Colors are the stock shadcn tokens. Font size, weight, leading, tracking, spacing, border width, radius, duration, easing and
   breakpoints come from Tailwind's default scale. No arbitrary values (`mt-[54px]`, `text-[13px]`, `grid-cols-[auto_1fr]`).
   If no step fits, use the nearest one.
   **Flat by default:** every `shadow-*` utility is neutralised in `globals.css` (`--shadow-*` tokens) and overlays do not blur
   (`backdrop-filter: none` on `[data-slot$="overlay"]`). Do not add shadows or blur. Layout regions are set apart by
   **surface, not lines**: no `border-*` on a page region, column or section plate ([Surfaces](#surfaces)); borders start at
   the cards inside a plate. Vendored components keep their own 1px rings and shadows; this rule is about layout.
   **Second exception: `app/global-error.tsx`.** It uses inline system-color styles (`Canvas`, `CanvasText`) because
   `global-error` replaces the root layout, so global CSS and the theme tokens are not loaded there.
2. **Smallest text is `text-xs`.** Weights are `font-normal` and `font-medium` only.
3. **Components keep their own sizes.** Pick a `size` / `variant` prop (`<Button size="sm">`). Never override height,
   padding or font size through `className`. Layout classes such as `w-full` or `mt-*` are fine. If no size fits, add a
   variant to the component instead of patching the call site.
4. **Dark first, light complete.** `defaultTheme="dark"`, but `:root` (light) and `.dark` both define every token. Never
   style for one theme only.
5. **Root stays 16px.** The rem scale must match Tailwind's.

---

## 2. Color

Defined in `globals.css` after Hairline UI's own site: neutral greys that step lighter instead of casting shadows, alpha
`border` / `input` / `accent` so they read on every surface, and one brand green. Exposed as utilities (`bg-background`,
`text-muted-foreground`, ...). Only the stock shadcn tokens exist: `background`, `foreground`, `card`, `popover`,
`primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1..5`, `sidebar-*` (each with
its `-foreground`), plus `--radius` (`0.625rem`). Both `:root` and `.dark` define every token.

| Token | Light | Dark | Role |
| :--- | :--- | :--- | :--- |
| `background` | `#ffffff` | `#191919` | Page; also the inside of a card in a plate |
| `card` | `#f5f5f5` | `#222222` | Section plate |
| `popover` | `#ffffff` | `#262626` | Menus, dialogs, sheets (Hairline) |
| `muted` / `secondary` | `#f0f0f0` / `#ededed` | `#2c2c2c` / `#303030` | Skeletons, wells, chips |
| `border` / `input` | `#262626` at 10% / 12% | white at 10% / 14% | Cards inside a plate, field outlines |
| `accent` | `#262626` at 5% | white at 6% | Hover fill (works on any surface) |
| `primary`, `ring`, `chart-1` | `oklch(64.48% 0.1488 158.78)` | same | Brand green: CTA fill, focus ring, logo, accents |
| `primary-foreground` | `#0a0a0a` | `#0a0a0a` | Text on green: 6.4:1 (white would be 3.1:1) |
| `chart-2..5` | blue, orange, violet, amber | lighter steps | Data series |

| Need | Use |
| :--- | :--- |
| Page and body text | `bg-background` / `text-foreground` |
| Descriptions, meta, labels, dates | `text-muted-foreground` (5.3:1 or better on every surface) |
| Section plate | `bg-card` (see [Surfaces](#surfaces)) |
| CTA fill | `bg-primary text-primary-foreground` (Hairline `Button`, `linkButton()`) |
| Hover surface | `bg-accent` |
| Errors, blocked | `text-destructive`, Hairline `<Alert tone="danger">` |
| Card inside a plate, field outlines | `border-border`, `border-input` |
| Brand accent | `text-primary`, `fill-chart-1` for icons, marks, large text. **Not for small text in light mode** (3.1:1 on white) |

To add a semantic color (success, warning), add a token to both `:root` and `.dark` and map it in `@theme inline`.

### Surfaces

Hairline-style plates. Depth comes from the surface stepping lighter (dark) or greyer (light), never from a shadow or an
outer border:

| Level | What | Classes |
| :--- | :--- | :--- |
| 0 Page | Body, sidebar, column headers | `bg-background` (sidebar `bg-sidebar`, the same value) |
| 1 Plate | A section: a group of content, an aside, a CTA band | `rounded-3xl bg-card p-6` (sm: `p-8`); **no border** |
| 1 Tray | A plate that only holds cards (stat tiles, a gallery) | `rounded-3xl bg-card p-2` |
| 2 Card | An item inside a plate: tile, open FAQ row, preview | `rounded-xl border bg-background p-4`; the border starts here |

- Radii are concentric: a tray's `p-2` (8px) plus the card's `rounded-xl` (14px) equals the plate's `rounded-3xl` (22px).
- Never nest plates (`bg-card` in `bg-card`); go one level down instead.
- Columns and page regions are separated by space or by surface, never by `border-r` / `border-b`.
- Lists inside a plate separate rows with `divide-y divide-border` or space.

---

## 3. Typography

| Family | Class | Use |
| :--- | :--- | :--- |
| Geist | `font-sans` | UI, headings, body, prose |
| Geist Mono | `font-mono` | Code, keys, env values and short technical values. Not for headings, nav or labels |
| Geist Serif | `font-serif` | Registered only. No component uses it by default |
| Geist Pixel (square, grid) | `font-pixel-square`, `font-pixel-grid` | Registered only; opt-in for a pixel accent |

The whole Geist family is loaded once in `@workspace/ui/lib/fonts` (`fontClassName` on `<html>`, `fontStyle` as its `style`);
both apps use it, so type never drifts between them. Do not load fonts per app.

| Role | Classes |
| :--- | :--- |
| Article / featured title | `text-3xl md:text-4xl font-medium leading-tight` |
| Page title (dashboard `PageHead`) | `text-2xl md:text-3xl font-medium tracking-tight`, description `text-base` |
| Hero display (landing) | `text-5xl sm:text-6xl font-medium tracking-tight`, two lines at most |
| Standfirst, prose | `text-lg leading-relaxed text-muted-foreground` (`max-sm:text-base`) |
| Row title, UI body | `text-base` |
| Subheading | `text-lg font-medium` with a muted one-line hint beside it |
| Nav, tabs, sidebar rows | `text-sm font-medium` |
| Group labels, table headers | `text-sm text-muted-foreground`, sentence case. No `text-xs` uppercase mono labels |

---

## 4. Spacing

Related things sit close, unrelated things sit far apart, and each tier is roughly 1.5 to 2.5 times the one below it.
That ratio is what makes the pages feel open yet clearly sectioned. Use the tier's class; do not invent new tokens.

| Tier | Tailwind | Measured | Use |
| :--- | :--- | :--- | :--- |
| T1 Glyph | `gap-1.5`, `gap-2` | 6-7px | List items, `dt` to `dd`, icon to text |
| T2 Group | `gap-3`, `gap-3.5` | 12-14px | Consecutive paragraphs; chip, title and author in one block; footer links |
| T3 Heading | `gap-5` | 18-20px | A heading to its first content |
| T4 Block | `gap-8` / `my-8`; `mt-9` before an H3 | 30-36px | Figures, tables, article meta, blocks inside one section |
| T5 Section | `gap-14` | 54px | Between sections of an article or doc page |
| T6 Page region | `pt-20` / `mt-20` | 72-80px | Nav to content, header to body, content to footer |
| T7 Major break | `mt-28` | 110px | End of main content to a different block (related posts, CTA) |

Rules:

- **A heading belongs to what follows.** Space above a heading is always larger than below (H3: `mt-9` above, `gap-5`
  below). Wrap heading and content in `flex flex-col gap-5` rather than giving each a margin.
- **Space first, surface second, border last.** Sections are separated by space or sit on a plate (`bg-card`); a border
  only appears on a card inside a plate ([Surfaces](#surfaces)).
- **Containers own spacing.** Use `gap` / `space-y` on the parent; avoid one-off margins on children.
- **One left axis.** Header, prose, lists and related posts all start at the content column; the rail never crosses it.
- **List rows carry their own padding.** `py-4` with `gap-0`, rows split by `divide-y divide-border` inside their plate, so the hover fill covers the row.

Horizontal: page gutter `px-9` (`max-sm:px-6`), 12-column grid with no column gap, rail `col-span-4 pr-10`, content
`col-span-8 pl-8`, prose `max-w-2xl`.

Component padding: list row `py-4`; featured row `py-4` with `gap-3` inside; media item (mod) `py-9`; figure `my-8 p-4`,
caption `py-2.5 px-4`; footer `pt-11 pb-14`, links `gap-3`.

- `ItemGroup` whose children are not real list items must pass `role="none"` (upstream `ItemGroup` ships `role="list"`).

---

## 5. Responsive

Pages use Tailwind's four default breakpoints and are written mobile-first; only one of them changes the layout.

| Breakpoint | Kind | What changes |
| :--- | :--- | :--- |
| `xl` 1280 | Tuning | Widest: rail at full 4 columns, rows on one line (date, title, duration) |
| `lg` 1024 | **Layout** | Below lg: nav becomes a burger, rail stacks above content and stops being sticky, TOC hides, rows split into two lines, featured post stacks, media items put media on top |
| `md` 768 | Hide extras | Below md: keyboard hint and category column hide, tabs wrap, newsletter goes one column |
| `sm` 640 | Margins and rhythm | Below sm: gutter `px-6`, nav `h-18`, prose `text-base`, footer two columns, outer spacing tiers shrink |

| Component | < sm | sm to lg | >= lg |
| :--- | :--- | :--- | :--- |
| Nav | `h-18`, burger | `h-24`, burger | `h-24`, full links with `[X]` keys |
| Rail / content | Stacked: rail becomes a static header block | Stacked | 4 / 8 columns, rail sticky |
| Article TOC | Hidden (share links only) | Hidden | Sticky in the rail |
| Post row | Two lines, date hidden | Two lines: title / date + duration | One line |
| Article meta | `grid-cols-2` | `grid-cols-3` | `grid-cols-3`, aligned to grid columns |
| Footer | `grid-cols-2`, brand and newsletter full width | `grid-cols-3` | Brand, two link columns, newsletter |
| Spacing T5 / T6 / T7 | `gap-10` / `pt-12` / `mt-16` | `gap-14` / `pt-20` / `mt-28` | same |

Principles:

- **One layout breakpoint.** Only `lg` may restructure a page; `sm`, `md` and `xl` adjust margins, hide extras or tune
  column ratios.
- **Reflow, don't shrink.** Type sizes barely change; rows split into two lines instead of truncating. The title always
  gets the first line.
- **Hide from least to most important:** keyboard hint, category, tile and TOC, then date. Titles, durations and CTAs
  never hide.
- **Hover effects need a mouse.** Tailwind v4's `hover:` already applies only under `(hover: hover)`; on touch, the
  tapped row takes the hover's role.
- **Shrink the outer tiers, keep the inner ones.** Only the gutter and T5-T7 change below `sm`.

```tsx
{/* Shell: rail stacked on mobile, 4/8 from lg */}
<div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-0">
  <aside className="lg:sticky lg:top-24 lg:col-span-4 lg:self-start lg:pr-10" />
  <main className="min-w-0 lg:col-span-8" />
</div>

{/* Post row: title on line 1, date + duration on line 2; one line from lg */}
<a className="flex items-start gap-4 py-4 lg:items-center">
  <PixelIcon className="size-8 shrink-0" />
  <div className="flex min-w-0 flex-1 flex-col gap-2 lg:grid lg:grid-cols-8 lg:items-center lg:gap-0">
    <span className="text-base lg:order-2 lg:col-span-5">{title}</span>
    <span className="flex gap-4 font-mono text-sm text-muted-foreground lg:contents">
      <time className="max-sm:hidden lg:order-1 lg:col-span-2" />
      <span className="lg:order-3 lg:col-span-1 lg:text-right">{minutes}</span>
    </span>
  </div>
</a>
```

---

## 6. Components

Radii from `--radius: 0.625rem`: `rounded-lg` 10px fields, `rounded-xl` 14px cards inside a plate, `rounded-3xl` 22px plates; Hairline buttons and toggles are pills. shadcn `base-nova` keeps its compact sizes, no shadows. Every component is installed (`shadcn add --all`), including the chat set (`message`, `bubble`, `code-block`, `trace`, `questionnaire`, `message-scroller`, `attachment`, `marker`) and `carousel`; add what the app needs, delete nothing.

**Hairline UI first.** Interactive and animated parts come from [Hairline UI](https://hairlineui.com) in
`@workspace/ui/components/hairline/*`; shadcn (`@workspace/ui/components/ui/*`) is the fallback when Hairline has no fit.
How to find, add, update and patch them: `.agents/skills/hairline-ui/SKILL.md`. Hairline takes data props
(`<Dialog title trigger footer>`, `<DropdownMenu items>`), not shadcn's compound parts.

| Need | Use |
| :--- | :--- |
| Primary CTA | Hairline `<Button size="lg">` (h-10, pill) |
| Button in a form or toolbar | Hairline `<Button>` (h-9) or `size="sm"` (h-7) |
| A link that looks like a button | `linkButton()` / `linkButton({ variant: "outline" })` from `@workspace/ui-patterns/link-button` (Hairline's `Button` is only a `<button>`) |
| Secondary action | `variant="outline"` |
| Form error / success notice | Hairline `<Alert tone="danger" title>` / `tone="success"` |
| Menus, dialogs, sheets, tooltips, toasts | Hairline `dropdown-menu`, `dialog`, `sheet`, `tooltip`, `toast-stack` (`<Toaster />` is in the root layout) |
| Copy / theme switch | Hairline `copy-button`, `ThemeToggle` (`@workspace/ui-patterns/theme-toggle`) |
| Changing numbers / labels | Hairline `number-roll`, `text-morph` |
| Charts | Hairline `charts` group (`area-chart`, `trend-chart`, `sparkline`, …); shadcn `chart` (recharts) only for what they cannot draw |
| Breadcrumb | shadcn `Breadcrumb` (Hairline's is a plain `<a>`, a full reload in Next) |

Rules:
- Never edit a file in `components/hairline/` or `components/ui/`: change a token, pick a prop, or wrap it in the app.
- Keep `@tabler/icons-react` as the icon library in app code. `lucide-react` is in `packages/ui` only because Hairline imports it.

Patterns specific to this language:

- **Inverted hover** on list rows: `hover:bg-primary hover:text-primary-foreground`, other rows dim to `opacity-35`.
- No ASCII hierarchy marks (`└`), bracketed keys or tiny mono uppercase labels. Hierarchy is size, weight and indent.

---

## Logo

`AppLogo` (`packages/ui-patterns/src/app-logo.tsx`, shared by `apps/web` and `apps/dashboard`): the **WattPrint** mark, a
home drawn as a wiring diagram. The roof apex is the one meter at the breaker; the two roof-and-wall lines and the centre
line are the feeds it splits into, each ending in a device dot. Lines are 2-unit round strokes on a 24 grid in
`currentColor` (they follow the theme); the three dots are `chart-1` (brand green). The wordmark reads `WattPrint`.
No animation.

| Prop | Values | Use |
| :--- | :--- | :--- |
| `variant` | `full` (default) · `mark` · `wordmark` | `mark` where space is tight or for icons; `wordmark` when the mark already shows nearby |
| `size` | `sm` 16px · `md` 24px (default) · `lg` 32px · `xl` 256px | Mark and wordmark scale together; the wordmark is mono `font-semibold tracking-tight` |

Rules:

- Do not redraw or recolor the mark at the call site; wrap it in a `Link` when it navigates. The logo is a block-level
  `flex w-fit` box (an inline box would sit on the text baseline and add a gap below it).
- Keep to the sizes above: below 16px the device dots merge into the walls.
- The favicon is `apps/{dashboard,web}/app/icon.svg`, the same mark with fixed light/dark ink (`prefers-color-scheme`).

---

## Landing layout (apps/web)

One centered screen: `SiteHeader` (logo, `ThemeToggle`; no borders), a display title, one plain line, the "Open dashboard"
`linkButton()`, and a quiet Terms · Privacy footer. Terms and Privacy reuse `SiteHeader` and `CONTAINER`
(`config/layout.ts`). No rails, no hairline bands: separate areas with space, not lines. Copy is plain.

---

## Updating shadcn and Hairline UI

The look lives in the tokens in `globals.css`, so components read the theme without being edited. That is what keeps updates clean:

- Do not restyle a component by editing its file. Change a token, or choose a `variant` / `size` / prop.
- shadcn lives in `packages/ui/src/components/ui/` (`aliases.ui` in `packages/ui/components.json`). Preview an update:
  `pnpm --filter @workspace/ui exec shadcn add <name> --diff`. `add --all --dry-run` lists every file; all 66 report
  `skip (identical)` (checked when Animate UI was removed), so any update applies with no conflict.
- Hairline lives in `packages/ui/src/components/hairline/`, installed by its own config in `packages/ui/hairline/`
  (`components.json` aliases into that folder, `items.json` is the installed set). `pnpm --filter @workspace/ui hairline`
  re-installs the whole set from upstream and re-applies `packages/ui/hairline/patch.mjs`; it is idempotent. Never use
  `npx shadcn add https://hairlineui.com/...` from `packages/ui`: that config would write Hairline's `button`, `select`,
  `dialog`… over shadcn's.

### Hairline patches

`packages/ui/hairline/patch.mjs` holds the few fixes made to vendored Hairline files, as exact string swaps with the
reason next to each. `pnpm hairline` runs it after every install; it skips a patch already applied and fails when upstream
rewrote the patched code (then re-check the bug on the new code; upstream may have fixed it). `patch.test.mjs` fails if a
vendored file is committed without its patch (for example after a bare `shadcn add`). Patched lines carry a
`patched (hairline/patch.mjs)` comment.

| File | Patch | Why |
| :--- | :--- | :--- |
| `toast-stack.tsx` | Server snapshot returns one cached `[]` | A new array per call made React warn on every page (`<Toaster />` is in the root layout) |
| `dropdown-menu.tsx`, `popover.tsx` | Portal into the enclosing `<dialog>` when there is one | A modal `<dialog>` (Sheet, Dialog) makes `<body>` inert: menus and the account panel in the mobile sidebar Sheet could not be clicked |
| `floating.ts` | `preventDefault()` on Escape | Escape in a menu also closed the Sheet/Dialog around it |
| `trend-chart.tsx`, `combo-chart.tsx` | The sr-only table sits in a `div.sr-only` | A `<table>` ignores the 1px height of `sr-only`: one row per bucket or day added a screen of empty scroll (dashboard Overview) |
| `revenue-chart.tsx` | The change chip passes `locales`; the sr-only table sits in a `div.sr-only` | The chip read "8.2%" beside Vietnamese figures; the table (one row per month) pushed the Statistics page 240px wider than a phone |
| `number-roll.tsx` | `overflow-clip` beside the `clip-path` | The clipped 0-9 digit stacks still counted as scrollable overflow near the end of a page |
| `log-stream.tsx` | The clock shows UTC until hydrated, then local time; narrow rows show the time without the milliseconds | The server renders in UTC, so the local clock mismatched on hydration (Activity tile); narrow rows hid the time |
| `compare-bars.tsx`, `combo-chart.tsx`, `donut-chart.tsx` | A `unit` prop written after every figure (feature patch) | Intl has no kWh or W unit, and the Overview puts units after numbers, not in titles |
| `compare-bars.tsx` | An `action` slot beside the title; the header wraps when narrow (feature patch) | The Overview's Week/Month switch, as `DonutChart`'s `action` |
| `compare-bars.tsx` | Bar slots and fills ease `left`, `width` and `height` (feature patch) | Switching Week/Month jumped every bar; with positional keys the bars now glide |
| `token-bucket.tsx` | A `fillUsed` prop: the tokens are what is used, packed from the left (first token in the leftmost slot, so they slide in left to right), and the figure, meter text and amber state count what is left (feature patch) | The Overview's tier card: a tariff tier reads as used kWh filling up, the empty end is what is left |
| `data-table.tsx` | An `onRowClick` prop: the whole row is clickable with an `accent` hover fill, Enter on a row and the narrow card open it too (feature patch) | The Devices list opens a device from anywhere on its row; a link in the name cell was a small target and `renderDetail` only opens a panel |
| `spending-ring.tsx` | With a category open, the legend starts with the same small "All" button as the ring's centre (feature patch) | Cost by room: after picking a room in the list, the way back sits where the hand is; the centre button alone was easy to miss |
| `floating.ts` | `themeVars` copies the anchor's theme tokens only when they differ from the page's; otherwise the portal inherits them live | Popovers, menus and tooltips froze the theme they opened in, so switching light/dark from the account menu left the menu in the old theme until it closed |
| `log-stream.tsx` | A `header` node above the toolbar (feature patch) | The title only named the log for screen readers: the Overview's device log was the one card without a heading |
| `token-bucket.tsx` | A `header` node that replaces the title row; `title` still names the meter (feature patch) | The Overview's tier card: the price now and the next one, large, with an arrow between |

Patches fix bugs first. A **feature patch** (marked above) is allowed only when the product needs a capability that no prop
or wrapper can give; keep it small, say why in `patch.mjs`, and list it here so an upstream update re-checks it.

Found by an audit of the whole folder (Next 16 prerendering, navigation, images, listeners, global side effects) and
handled in app code instead of patches. Keep them in mind when adopting more components:

- **Reads the clock while rendering** (`relative-time`, `action-receipt`, `chat-history`, `date-range-picker`,
  `time-range-picker`, `domain-connect`, `auth-card`, `week-calendar` without `defaultDate`, `notification-inbox`,
  `cron-input`, `filter-bar`'s `matchFilters`): outside `<Suspense>` they fail the prerender; wrap them or pass the date in.
- **Plain `<a href>` for internal links** (`integrations`, `notification-inbox`, `morphing-nav`, `cookie-banner`,
  `button-group`, `breadcrumb`, `empty-state`) or `window.location.assign` (`command-palette`, `onboarding-checklist`
  without `onSelect`): pass `onSelect` / `onClick` with `router.push`, or keep shadcn for that part.
- **Floating parts portal to `<body>`** (`tooltip`, `hover-card`, `context-menu`, `combobox`, `date-picker`,
  `multi-select`, `color-picker`, `time-range-picker`, `time-picker`): inside a Dialog/Sheet they open behind it. Add them
  to `patch.mjs` (same change as `dropdown-menu`) the first time one is used inside a dialog.
- **Toasts render behind an open Dialog/Sheet**: show errors in the dialog (Alert) or toast after it closes.
- **`<Toaster />` binds Alt+T on the whole page** (blocks typing "†" with Option+T on macOS); `hotkey=""` turns it off.
- **`<img>`** in avatars, team rows, chips: the dashboard CSP (`img-src 'self' blob: data:`) blocks external photos;
  serve them through `/_next/image` or allow the host.
- **`Button` with `loading`/`status`** replaces non-string children with its default labels: pass `statusLabels`.
- **Dialog content that scrolls sideways** can't be scrolled by trackpad/touch (`modal.ts` only lets vertical scrollers
  through) and pinch-zoom is blocked while a dialog is open.
- **CSS cost**: Tailwind scans the whole folder, so every Hairline class ships in each page's CSS (~139 KB raw / 17 KB gzip
  of the dashboard's 362 KB / 50 KB when measured). Narrowing `@source` to imported files would break styles silently the
  day someone imports a new component, so it is left as is.

---

## 7. Navigation

- Site nav: sticky, `h-24` (`max-sm:h-18`), brand left, links with `[X]` keys in the middle, commands and CTA right.
- Below `xl` (or whenever the links stop fitting) the links move into a **burger panel**: a `size-9` button with three
  2px bars that turn into an X (`aria-expanded`, `aria-controls`). The panel drops under the nav, full width, `bg-background
  border-b`, groups labelled with mono `text-xs` headings, links `font-mono text-sm py-2.5`. It closes on link click, Esc,
  outside click, and when the viewport grows past the breakpoint.
- Between `xl` and `2xl` hide the `[X]` brackets first (keys still work), then fall back to the burger.
- In-page links scroll with an offset equal to the nav height (`scroll-mt-24`); the logo always scrolls to `0` and clears
  the hash, so clicking it twice still works.

---

## 8. Dashboard shell

The app layout extends the same language: the article TOC "tree" becomes the sidebar, the Mods spec list becomes a
detail sheet. Reference demo: the "Next Mono Base Design System" artifact, section 06.

### Anatomy

Two full-height columns. Each column is a **header cell** plus a scrolling body. All header cells use one shared
component so they always line up; there is no rule between header and body or between the columns. Anything more (a record, an order, a file) opens
as a [detail sheet](#detail-sheets) from the page, never as a third column.

```tsx
function ColumnHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex h-14 shrink-0 items-center gap-4 px-4">{children}</div>
}
```

| Column | Top | Body |
| :--- | :--- | :--- |
| Sidebar (`components/layout/sidebar/sidebar.tsx`, `w-64`) | A **plate floating on the page**: `p-2` frame, `rounded-3xl bg-sidebar` (= `card`). Header cell: logo + sidebar trigger | `px-2 py-6 gap-8`: one labelled **section** per nav group, then the account row pinned to the bottom (no label) |
| Main (`flex-1 min-w-0`, on the page, scrolls with the document) | **No header bar.** A small `h-8` breadcrumb row (`text-sm`, chevrons) right above the page head; below `md` it starts with the sidebar trigger and the logo | `px-4 sm:px-8 pt-4 md:pt-8 pb-14`; breadcrumb then `gap-8` content: page head, plates, cards |

The shell holds no state but the sidebar's (`SidebarProvider`); `next-themes` owns the theme, chosen in the account panel.

Scroll areas hide their scrollbar but stay scrollable (mouse, keys, touch):

```css
@utility no-scrollbar { scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
```

### Sections

The sidebar holds any number of **sections**, each a mono `text-xs` uppercase label over a tree
(`config/navigation.ts`, `NavSection`). Name a section after what its pages are about (`Overview`, `Billing`,
`Settings`), never after the widget ("Tree", "Menu"). A section whose links the role cannot open is hidden. Inside a
section an entry is a link or a collapsible group of links (two levels max).

### Scoped menus

The menu depends on the URL: `/<prefix>/<id>/...` shows that scope's menu, everything else the global
one. A menu is a `NavScope` in `NAV_SCOPES` (`config/navigation.ts`): plain data (`id`, `prefix`, `param`, `sections`) whose hrefs
hold `:param` placeholders. `SessionNav` (server) filters every scope by role; the client `ScopedNav` picks the scope from
`usePathname()` and renders `NavTree`, which knows nothing about scopes. How to add one, with the breadcrumb and the gate layout:
[routing-and-layouts.md](routing-and-layouts.md) §6.4.

`SidebarTrigger` sits in the sidebar's header (Cmd/Ctrl+B also works). There is no theme button in the shell: the
account row (initials `Avatar`, name, role, a selector caret) opens a Hairline `Popover` with who you are, a
**Theme** row (`ThemeToggle variant="segmented"`: Light / System / Dark) and Sign out. Icons are functional only: one per navigable page (and the
account row), never on group headers or menu items.

Top row below `md`: sidebar trigger, wordmark, chevron, current page in ink, truncated with `…` rather than wrapping.

### Icon rail

The sidebar uses `collapsible="icon"`: the trigger (or a click on the rail edge) shrinks it from `w-64` to a 48px rail instead of
hiding it, so every page stays one click away.

- Every nav link carries its icon and its label. In the rail only the icon shows (the label hides; the
  current page's icon is `text-foreground` there) and a right-side tooltip names it (`SidebarMenuButton`'s rule: only
  while collapsed on desktop).
- The rail lists individual pages only, never groups: a section label gives way to the gap between sections, a collapsible
  group loses its header and its links show flat (open or closed). The logo shrinks to its mark and the account row to
  a user icon whose menu opens to the right.
- Icons are named in `config/navigation.ts` (`NavLink.icon: NavIconName`) and resolved to components in
  `components/layout/sidebar/nav-icons.tsx` (a `Record`, so a new name without an icon fails typecheck). Names, not components,
  because `entries` cross from a Server Component to the client `NavTree`.
- Rows use `group-data-[collapsible=icon]:*` variants of the sidebar's own `group` wrapper; no JS state except the tooltip.

### Menu rows

| State | Look | Classes |
| :--- | :--- | :--- |
| Default | Tabler icon `size-4` and label, `text-muted-foreground`, `rounded-xl px-1.5 py-1.5`, transparent border | `text-sm` |
| Hover | Label `text-foreground`, hover surface | `hover:bg-accent hover:text-foreground` |
| Current | A card inside the sidebar plate: `bg-background` + `border-border`, label `font-medium text-foreground` | `aria-current="page"`, `data-current` |
| Group | Label and a caret that rotates when collapsed (no icon); children indent | `aria-expanded`, children `pl-3` |
| Count | Right aligned | `ml-auto text-xs text-muted-foreground tabular-nums` |

Keep the tree at most two levels deep; deeper structure belongs on its own page. Keyboard: arrows move, left/right
collapse and expand groups, Enter opens.

### Content conventions

- **One focal accent per screen**: the current tree item. Status uses small square dots: `bg-foreground` for "needs
  review", `bg-destructive` for blocked, `bg-muted-foreground/50` for done.
- **No big-number tiles.** Metrics are one `dl` row: mono `text-xs` label, `text-2xl font-medium` value, separated by space.
- **Dashboard tiles are Hairline cards.** The Overview bento is made of self-carded Hairline components (`bg-background`,
  1px ring). A hand-made tile beside them copies that shell (`rounded-3xl border bg-background`) instead of a plate, so the
  grid reads as one set: today only the weather card. Its liquid takes a Tailwind palette colour per sky (amber clear,
  sky rain…) with a matching ink; that is the one place app code uses palette colours, like Hairline's status colours.
- **Selected list row is inverted** (`bg-primary text-primary-foreground`); hover is only `bg-accent`.
- **A detail sheet is context, not a route.** It opens from the page that owns the data and keeps its own open state.
- **Usage meters are flat**: a `bg-primary` fill over a `bg-muted` track (shadcn `Progress`).
- One tier denser than marketing pages on the outside only: page top `pt-10` instead of `pt-20`, sections `gap-10`
  instead of `gap-14`; T1 to T4 unchanged.

### Responsive

| Region | < lg | lg to xl | >= xl |
| :--- | :--- | :--- | :--- |
| Sidebar | Hidden below `md` (shadcn's `useIsMobile`, 768px); the trigger opens it as a left Sheet | `w-64` from `md`; the trigger collapses it to a 48px icon rail | same |
| Detail sheet | Full width, panes stacked | `42rem`, draggable wider or narrower, panes side by side from `@xl` | same |
| Logo | Main header, next to the trigger | Sidebar header | Sidebar header |
| List row | Two lines: title / id, status, time | One line | One line |
| Metrics | `grid-cols-2` | `grid-cols-4` | `grid-cols-4` |
| Header buttons | Trigger and theme toggle | same | same |

Needed components: `pnpm dlx shadcn@latest add sidebar sheet badge tabs` (from `packages/ui`). shadcn's sidebar width
comes from the `--sidebar-width` variable; change it in the theme rather than with a class.

### Implementation (apps/dashboard)

shadcn and Hairline files in `packages/ui` are **never edited**, so `shadcn add --overwrite`, `pnpm hairline` and future migrations stay clean. The
Next Mono Base look is composed on top in `apps/dashboard/components/layout/`, grouped by area (`sidebar/`, `header/`; `ColumnHeader` and `PageHead` sit at the root). No barrel `index.ts`: import the file you need (`@/components/layout/sidebar/nav-tree`):

| Part | File | Built from |
| :--- | :--- | :--- |
| `ColumnHeader` | `column-header.tsx` | Plain `div` (`h-14 px-4`, no border) |
| `SidebarProvider`, `Sidebar`, `SidebarTrigger`, `useSidebar` | `sidebar/sidebar.tsx` | Our own (Hairline ships no sidebar): a column easing between `w-64` and the 48px rail on Hairline's `EASE_OUT`, Cmd/Ctrl+B; below `md` a Hairline `Sheet` from the left. Keeps shadcn's `group` + `data-collapsible="icon"` contract |
| `AppSidebarBody`, `AppSidebarSection` | `sidebar/app-sidebar.tsx` | Plain markup; `data-sidebar="group"` / `"group-label"` |
| `NavTree` | `sidebar/nav-tree.tsx`, `sidebar/nav-icons.tsx` | `ul`/`li`; one hover surface glides between `[data-sidebar=menu-button]` rows (as in Hairline menus); groups open with a `grid-template-rows` ease and are `inert` when closed; Hairline `Tooltip` names the icon, only in the rail |
| `ThemeToggle` | `packages/ui-patterns/src/theme-toggle.tsx` | Hairline `ThemeToggle` controlled by `next-themes` (a placeholder until mounted). `variant="segmented"` in the account panel; the icon button only where no account exists (landing header, auth rail footer) |
| `DetailSheet*` | `components/shared/detail-sheet.tsx` | Compound parts over shadcn `Sheet` (kept: Hairline's Sheet has a fixed header and width; see Detail sheets) |
| `UserMenu` | `sidebar/user-menu.tsx` | Hairline `Popover` (288px) off the account row: `Avatar`, name, email, Theme row, then the caller's children (`SignOutButton` from `features/auth`, a `secondary` Hairline `Button`) |
| `DashboardBreadcrumb`, `CrumbMenu` | `header/dashboard-breadcrumb.tsx`, `header/crumb-menu.tsx` | shadcn `Breadcrumb` (links stay `next/link`); scoped pages start with a Hairline `DropdownMenu` of siblings (`Crumb.options`, `router.push` on select) then the page title from the nav |
| `ScopedNav` | `sidebar/scoped-nav.tsx` | Client; the sidebar sections of the current scope, over `NavTree` |
| `PageHead`, `Metrics`, `SpecList` | `page-head.tsx`, `components/shared/` | Plain markup; `PageHead` takes an optional `action` beside the title (the Overview's weather card), which drops under it on narrow screens |
| `InfoHint` | `components/shared/info-hint.tsx` | `Popover` + ghost `icon-xs` `Button`; copy comes from `config/help.ts` (also read by the Guide page). `PageHead`, `Metric` and section titles take a `hint` key |
| `ResponsiveDialog` | `components/shared/responsive-dialog.tsx` | Hairline `Dialog` from `md` up, bottom Hairline `Sheet` below; `size` `md` (520px) or `lg` (680px); `DialogActions` for the button row. Use it for every form that opens over a page |

The sidebar switches to a Sheet below `md` (768px, shadcn's `useIsMobile` from `@workspace/ui/hooks/use-mobile`) and keeps one width (`16rem`). A fixed third column
is not part of the shell: use a detail sheet.

### Detail sheets

A record that needs more room than a row (an order, a file) opens in a right `Sheet` from the page that owns
the data. It never takes layout space and the shell keeps no state for it. Built with composition
(vercel-composition-patterns): compound parts over one `Sheet` instead of boolean props, and the open state and the
width live inside the sheet, so a page needs no provider and the header no button.

**Size.** The sheet opens fitting its content (`42rem`) and is resized by dragging its left edge (a `role="separator"` handle:
arrow keys step 32px, double click resets, minimum 384px, maximum the viewport minus 64px). The width is remembered in
`localStorage` (`storageKey` prop). Below `sm` it is always full width and the handle is hidden. The panes split on the
sheet's own width (container query `@xl`), not the viewport's.

**Three header tiers**, each a part, so every level reads on its own:

| Tier | Part | Holds |
| :--- | :--- | :--- |
| 1 The record | `DetailSheetHeader` (`h-14`) | `DetailSheetClose` (`»`), kind tile, title, copy buttons, then at the right Previous / Next as one `ButtonGroup` of `icon-sm` outline buttons (tooltip with `J` / `K`) |
| 2 A pane | `DetailSheetPaneHeader` (`h-12`, `bg-card`) | List pane: label with count, expand-all. Detail pane: kind tile, name, copy id, kind badge |
| 3 Content | `DetailSheetPaneBody` | Meta row (icon + value), tags, `Tabs`, then the tab content |

```tsx
<Sheet>
  <SheetTrigger render={<Button size="lg" />}>Open record</SheetTrigger>
  <DetailSheetContent>
    <RecordProvider>
      <DetailSheetHeader>
        <DetailSheetClose />
        …
      </DetailSheetHeader>
      <DetailSheetSplit>
        <DetailSheetList>
          <DetailSheetPaneHeader>Items (8)</DetailSheetPaneHeader>
          <DetailSheetPaneBody><ItemTree /></DetailSheetPaneBody>
        </DetailSheetList>
        <DetailSheetMain><ItemDetail /></DetailSheetMain>
      </DetailSheetSplit>
    </RecordProvider>
  </DetailSheetContent>
</Sheet>
```

**Interactive tree in the list pane.** Build it the way shadcn's File Tree does (ui.shadcn.com/docs/ai-elements/base/file-tree):
a node with children is a `Collapsible` whose chevron (`Button variant="ghost" size="icon-xs"`) toggles it, every node is a
`Button variant="ghost" size="sm"` that selects it, children sit in `CollapsibleContent` indented with `ml-3 border-l pl-1`.
States: hover `bg-muted` (the ghost default), selected `data-current:bg-primary/10`, selected and hovered
`data-current:hover:bg-primary/15`. A ghost `Button` paints `aria-expanded` as a hover surface, so the chevron overrides it
(`aria-expanded:bg-transparent aria-expanded:hover:bg-muted`); otherwise every open node looks hovered. In light mode
`muted`, `accent` and `secondary` are the same grey, so never tell hover from selected with those.

The selection, the open nodes and the `J` / `K` keys are shared by the tree, the detail pane and the stepper, so they live in a
provider inside the sheet (`RecordProvider` + `useRecord`), not in the shell. It mounts with the sheet and goes with it.
Other shadcn parts for similar jobs: `Accordion` (flat expandable list), `SidebarMenuSub` (navigation only), `Tabs`
(peer views of one record).

**Performance** (what made the first version laggy, and what Opik does instead): Opik's `ResizableSidePanel` writes
`style.left` straight to the element while dragging, with no React state and with the CSS transition switched off, and saves
the width on release. In the same spirit here:

- Do not animate a size. Animating `width` / `max-width` re-lays out the whole sheet on every frame (worse with a container
  query inside). Slide with `transform` and `opacity` only; resize instantly.
- No `backdrop-filter`. A blurred full-screen overlay repaints under every frame of the sheet's slide.
- Memoize the provider value and give its actions stable identities (`useMemo`, `useCallback`); attach window listeners
  once (`useEffectEvent` reads the latest state), never one per render.
- The resize handle does what Opik's does: during the drag it writes the `--detail-sheet-width` CSS variable on the sheet through
  a ref (no React state, no transition) and commits to `localStorage` on pointer up.
- Long lists or trees (hundreds of nodes) need virtualization; the 8-node demo does not.

Rules: always render a `SheetTitle` (and a `SheetDescription`, `sr-only` if needed); never put `w-*` on `SheetContent`
(use the sheet's own width); a client part that needs `window` (copy link) is its own component, because a server page
cannot pass functions or icon components to a client one. The parts live in `components/shared/detail-sheet.tsx`.

---

## 9. Motion

Interactive components use **Hairline UI**: CSS transitions and the Web Animations API on its own tokens
(`EASE_OUT`, `EASE_SETTLE`, `EASE_THROW`, `INTERACTION_PRESS` 3% press, from `@workspace/ui/components/hairline/motion`), no
animation library and no provider. Hand-written motion uses those tokens; plain CSS transitions use Tailwind durations
(`ease-out` to enter, `ease-in-out` to leave):

| Interaction | Implementation / Classes |
| :--- | :--- |
| Interactive parts (menus, dialogs, sheets, tooltips, toasts, buttons) | Hairline (`@workspace/ui/components/hairline/*`) |
| Sidebar hover & collapse | `NavTree` gliding hover surface (220ms `EASE_OUT`), width `w-64` ↔ `w-12` (300ms `EASE_OUT`) |
| Theme switch | Hairline `ThemeToggle` (sun/moon morph, circular reveal through View Transitions) |
| Copy feedback | Hairline `CopyButton` (icon blurs into a self-drawing check, label morphs) |
| Changing numbers / labels | Hairline `NumberRoll`, `TextMorph` |
| Color change (links, rows) | `transition-colors duration-150` |
| Small movement (arrow, TOC item) | `transition-transform duration-200 ease-out`, `translate-x-1` |
| Dropdown caret | `rotate-180 duration-300` |
| Reveal on enter | `tw-animate-css` fade/slide, `duration-500`/`700`, stagger `delay-75` steps |

Everything respects `prefers-reduced-motion` (Hairline reads it itself; `useInteractionReducedMotion()` in hand-written
motion; `motion-safe:` / `motion-reduce:` for CSS).

Applied in `apps/dashboard`:

| Pattern | Where | Implementation |
| :--- | :--- | :--- |
| Stagger on enter (slide up 8px, `duration-500`, `delay-75` steps) | Dashboard body, auth form column | `components/shared/stagger.tsx` (direct children, `*:nth-N:delay-*`). Plays once per element: Cache Components hides visited routes with `display: none` and a CSS animation restarts when its element is shown again, so each child switches its animation off when it ends (`onAnimationEnd`) and going back is instant |
| Stack logos reveal in order | Auth rail | `app/(auth)/_components/stack-showcase.tsx` (`Stagger`) |
| Sun sets into a moon, circular reveal | Theme toggle | `packages/ui-patterns/src/theme-toggle.tsx` (Hairline) |
| TOC nudge (`translate-x-1`, `duration-200`) | Sidebar nav rows | `NavTree` `RowLabel` |
| Arrow slides on hover (`translate-x-1`) | Auth switch link, 403 CTA | `group-hover` on the icon |
| Caret rotates (`duration-300`) | Collapsible nav group | `NavTree` `TreeGroup` |


Not used: the typing intro and ambient float (custom keyframes are allowed for the logo only), and the theme switch
stays instant.

---

## 10. Accessibility

- Focus: visible `outline` with `outline-offset-2`; never remove it without a replacement.
- `text-muted-foreground/50` is decorative; readable text uses `text-muted-foreground` or stronger.
- Anchor targets sit below the sticky nav: give them `scroll-mt-24` (`max-sm:scroll-mt-18`).
- `::selection` uses `bg-primary text-primary-foreground`.
