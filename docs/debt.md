# Debt

Shortcuts and deferred findings. Each entry: what, why it was left, when to pay it.

## Open

- **Home settings location card never had its two-column layout.** `features/home/components/home-settings.tsx`:
  the `@xl:` variants sat on the `@container` element itself, so they never applied. The sdlc pilot (2026-11-20)
  kept the stacked layout that users actually see. Pay when the settings page gets a design pass: put `@container`
  on the parent and test at 375 and 1440 px.
- **Decide on superpowers.** The sdlc skill names `superpowers:*` as default providers for intent, spec, plan,
  build and debug; it is not installed, so the inline fallbacks run. Install it, or set `providers` in
  `.claude/sdlc.json` to the fallbacks explicitly, after the pilot's 1–2 weeks of measurements.
