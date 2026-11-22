---
paths:
  - "apps/**/*.tsx"
  - "packages/ui-patterns/**/*.tsx"
  - "packages/ui/src/styles/**"
---

# UI: rules agents miss

Source of truth: `docs/design-system.md`, skills `design-system` and `hairline-ui`. ESLint already rejects arbitrary Tailwind values, weights other than normal/medium, shadows/blur and `lucide-react`.

- Hairline UI (`@workspace/ui/components/hairline/*`) before shadcn (`components/ui/*`) before hand-rolled. Check the `hairline-ui` MCP first.
- Component sizes come from `size` / `variant` props; never `h-*`, `px-*`, `py-*`, `text-*` on a shadcn or Hairline component through `className`.
- Colors are stock tokens (`bg-background`, `text-muted-foreground`, `bg-primary`), never hex or `dark:` color pairs. Both themes must work; dark is the default. The one exception is the weather
  card's per-sky palette (liquid + ink pairs), allowed by `docs/design-system.md` (Dashboard tiles).
- Surface, not lines: page → plate `rounded-3xl bg-card p-6` with no border → cards `rounded-xl border bg-background p-4`. No plate in a plate.
- Spacing from the tier table (design-system skill), on the parent with `gap-*`. Metrics are a `dl` row, not stat cards.
- Motion: transform/opacity only, guarded by `motion-safe:`. Check 375, 768, 1024 and 1440 px in both themes; open the page in the running app.
