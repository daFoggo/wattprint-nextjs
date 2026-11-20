# Debt

Shortcuts and deferred findings. Each entry: what, why it was left, when to pay it.

## Open

- **Home settings location card never had its two-column layout.** `features/home/components/home-settings.tsx`:
  the `@xl:` variants sat on the `@container` element itself, so they never applied. The sdlc pilot (2026-11-20)
  kept the stacked layout that users actually see. Pay when the settings page gets a design pass: put `@container`
  on the parent and test at 375 and 1440 px.
- **Hallmark beside the design system.** superpowers and hallmark are enabled for the team (`.claude/settings.json`).
  hallmark fills the `ui-new` role, but this repo already has a design system (`docs/design-system.md`), which must
  win. A trial showed hallmark keeping the repo's rules; check the first real new page against the ESLint design
  rules and the docs before trusting it.
