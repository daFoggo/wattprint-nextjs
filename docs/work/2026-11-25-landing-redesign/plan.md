# Plan: landing rebuild

Spec: `spec.md`. Build: inline. Replaces the first plan (rejected direction).

| # | Task | Files | Proof | Standards |
|---|------|-------|-------|-----------|
| 1 | Hairline update and Windows fix for `patch.mjs` | `packages/ui/hairline/*`, vendored output | `pnpm exec vitest run hairline` (4 pass); `packages/ui` tsc | vendored-ui.md |
| 2 | Landing tokens and stylesheet | `apps/web/app/landing.css`, `app/[locale]/layout.tsx` | lint, both themes in screenshots | ui.md |
| 3 | Header (CardNav port) | `components/card-nav.tsx`, `site-header.tsx`, messages | open/close by click, Escape, outside press; 390 and 1440 | ui.md |
| 4 | Hero with the overview capture | `components/landing/hero.tsx`, `product-shot.tsx`, `public/landing/*` | 1280×800 fold check | ui.md |
| 5 | Sections: split, how, six tabs, proof, FAQ, CTA | `components/landing/*`, `app/[locale]/page.tsx`, messages | screenshots 390/1440 × light/dark | ui.md |
| 6 | Shared Wappi + interactive band | `packages/ui-patterns/src/{wappi.tsx,wappi.avatar.json,ajv-browser.ts}`, both `next.config.ts`, dashboard `wappi-avatar.tsx`, `ajv-browser.test.ts`, `components/landing/wappi-band.tsx` | dashboard `ajv-browser.test.ts` (3 pass); clicked through in the browser | vendored-ui.md, ui.md |
| 7 | Footer (ridge, full width, rounded top) | `components/site-footer.tsx`, `landing.css` | screenshot in a real browser (WebGL) | vendored-ui.md |

Risks: the landing CSP has no `unsafe-eval` in production, so the Ajv alias in `apps/web/next.config.ts` is required
for Wappi; untested by a production build here (CI runs `next build`).
