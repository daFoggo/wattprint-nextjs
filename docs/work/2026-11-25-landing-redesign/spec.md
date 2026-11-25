# Spec: landing rebuild (apps/web)

Record: none · Intent: `intent.md` · Approval: the user approved each step in chat on 2026-11-25 (layout "Làm theo bố
cục này", then the footer, Wappi and six-tab follow-ups). This replaces the first draft (sentence-split hero, reel,
library photos), which the user rejected.

## Approaches

1. **Hairline-template structure with real product captures (picked).** After studying all 61 Hairline templates,
   Sense and Lunar Energy: a centred hero over a real dashboard capture, then sections that share one head (title left,
   sentence right) and one visual module each, a forest Wappi band, two-column FAQ, a CTA plate and the ridge footer.
2. Isometric drawn apartment as the hero signature (Kilowatt-like). Built and rejected by the user: the drawing read as
   sloppy; "replace it with the dashboard overview".
3. Sentence-split hero with a reel and library photos (first draft). Rejected by the user.

## Requirements

1. **Header**: React Bits CardNav, adapted: tabler icons, every string from next-intl (vi/en), landing tokens, solid
   surface, no shadow. Menu opens three cards (Product: how / Wappi / FAQ anchors; Demo home: the demo; Legal: terms,
   privacy). Locale and theme controls in the bar on wide screens, under the cards below 640px. Escape and an outside
   press close it; focus returns to Menu on Escape. Reduced motion: no spring.
2. **Hero**: centred headline (≤ 2 lines at 1440), one sentence, one action (the demo); below, the dashboard overview
   capture (light/dark pair) on a forest plate. Headline, sentence and action visible at 1280×800.
3. **Bill vs appliances** (`#split-title`): the cycle's bill as one number beside the same cycle split by appliance,
   figures from the demo home (cycle to 25/11), each with a share bar; per-appliance figures labelled as estimates.
4. **How** (`#how`): three steps (breaker, model, money).
5. **Features** (`#product`): Hairline `FeatureTabs`, six tabs in the dashboard sidebar's order (overview, statistics,
   appliances, alerts, savings plan, bill), each a real capture of the demo home in both themes.
6. **Proof**: three published findings with their sources (Attari 2010, Buckley 2020, Nguyen et al. 2024), as text in
   the page's language (ranges and decimals do not fit an animated number).
7. **Wappi** (`#wappi`): the dashboard's own Wappi character, shared through `@workspace/ui-patterns/wappi` (one
   character file for both apps). Three example questions; picking one plays read → work → answer (the same avatar
   states the dashboard uses) and shows the demo home's real answer rows. Head follows the pointer; a press makes it
   bounce. Avatar-core's Ajv must not need `unsafe-eval`: both apps alias `ajv/dist/2020.js` to the shared stub.
8. **FAQ** (`#faq`): Hairline `FaqAccordion`, title left. **CTA**: lime plate, the demo action.
9. **Footer**: Hairline `RidgeFooter`, edge to edge, forest plate in both themes, top corners rounded, bottom square.
   Restyled from a wrapper class only (vendored file untouched).
10. Repo rules hold: no arbitrary Tailwind values, tokens only (`app/landing.css`), no hardcoded JSX text, tabler icons,
    `motion-safe`/reduced-motion fallbacks, both themes, 375–1440 without horizontal scroll.

## Areas of concern

- The dark captures were taken at a different time from the light ones, so a few figures differ slightly (225.535 ₫ vs
  225.542 ₫ in the hero). The section copy quotes the light figures.
- `@hairline/sidebar`, `page-header` and `page-outline` are installed for queued work (dashboard sidebar swap, legal
  pages) and unused in this change.
- The auth-rail captures in `apps/dashboard/public/auth` and `apps/keycloak-theme/public/auth` belong to the queued
  auth-rail change and are unused here.
- `packages/ui/hairline/patch.mjs`: the entry check now compares `import.meta.url` with `pathToFileURL(argv[1])`, so
  the script runs on Windows (it silently did nothing before).
