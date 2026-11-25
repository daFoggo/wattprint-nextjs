# Review: landing rebuild

Base: `20987fb535e74537d65f15586da9796a288317c3` · R1 snapshot: `158a5e001462c14da26a38bb00e0c2c40b9dd63a`

## R1 (full, opus)

| # | Finding | Severity | Outcome |
|---|---------|----------|---------|
| 1 | Wappi band froze on "reading" when the same chip was picked again (effect keyed on the question) | Must | Fixed: step logic moved to `components/landing/wappi-steps.ts`, the effect keys on a `run` counter; `__tests__/wappi-steps.test.ts` (4 tests, failed first) |
| 2 | Anchor targets hidden under the sticky header (`scroll-margin-top` 24px vs a 76px header) | Must | Fixed: `scroll-margin-top: calc(64px + 2.25rem)`; checked in the browser (`#faq` lands at 100px, header ends at 76px) |
| 3 | Vendored `sidebar`, `page-header`, `page-outline` and the auth captures unused in this change | Should | Ruling below; the auth captures are now used by the rebuilt sign-in rail |
| 4 | No test for the Wappi band's step logic | Should | Fixed with #1 |
| 5 | Dead `demo-day.ts` and unused message keys | Minor | Fixed: file and keys deleted |
| 6 | English page wrote 225.542 ₫ | Minor | Fixed: English figures use the English separator |
| 7 | Dark capture had `alt=""` | Minor | Fixed: both captures carry the alt (the hidden one is `display: none`) |
| 8 | Hero loaded both captures eagerly | Minor | Fixed: only the dark (default theme) capture is eager |
| 9 | Avatar state names copied from `moods.ts` | Minor | Kept, with the source named in a comment next to the constants |
| 10 | Vendored footer's `aria-label="Footer"` untranslated | Minor | Fixed: `useHairlineText` patch in `hairline/patch.mjs`, "Chân trang" in `hairline-messages.ts` |

Ruling: #3 — the user asked for `sidebar` and `page-header` (to replace the dashboard's own) and `page-outline` (legal pages) in this same request; those are queued changes, and removing then re-adding them churns the vendored output. Cost if wrong: about 2,200 vendored lines ship before their consumer.

## Scope added after R1 (user requests in the same session)

Copy rewrite (Sense tone, no "demo home" wording), icons, Hairline pill tabs (7 pages incl. Wappi), React Bits text and number motion
(Blur Text, Count Up, Decrypted Text, Animated Content), PillLink-style buttons, header control sizes, CardNav narrow layout in CSS,
Wappi auto-demo, shared Wappi in `ui-patterns` loaded with `next/dynamic` (landing and dashboard), SEO metadata/JSON-LD/sitemap,
sign-in rail (dashboard and Keycloak) on a new `brand-field` token, screenshots per page from REFIT House 5 or Plegma House 1.
This is new scope, so it gets its own R1 before commit.

## R1 of the added scope (full, opus; package `--since 158a5e0`)

| # | Finding | Severity | Outcome |
|---|---------|----------|---------|
| 1 | Vietnamese section links became `#how` on /terms and /privacy (`"/"` lost to the trailing-slash trim) | Must | Fixed in header and footer through `sectionHref` (lib/seo.ts); `lib/__tests__/seo.test.ts` failed first |
| 2 | JSON-LD `<` escape was a no-op | Should | Fixed through `jsonLd` (lib/seo.ts), tested with a `</script>` string |
| 3 | `.mcp.json` adds an unpinned `shadcn@latest` MCP server | Should | Ruling below; version pinned to `shadcn@4.23.0` |
| 4 | AnimatedContent hid content until hydration | Minor | Gone: the reveals are CSS now (`animation-timeline: view()`), visible without script |
| 5 | Split shares did not match the 111.9 kWh base | Minor | Fixed: 45%, 12%, 12% of the same cycle |
| 6 | `meta.ogAlt` unused | Minor | Fixed: the OG image carries it (`openGraphBase`) |
| 7 | Home page had no og:title/description/url | Minor | Fixed in `page.tsx` |
| 8 | Hidden narrow-screen controls counted in the CardNav stagger | Minor | Fixed: hidden refs are skipped |
| – | Auto-demo announced through `aria-live` unprompted | (declined to judge) | Fixed anyway: the region is live only after the visitor asks |

Ruling: #3 — the user asked to install React Bits' MCP ("Cài vào mà dùng"), which is shadcn's MCP server with the `@react-bits`
registry. Cost if wrong: one extra MCP server per agent session in this repo; pinned so it does not drift.

## Performance pass (user request)

Lighthouse on `next build` + `next start`: the mobile landing spent most of its blocking time hydrating React Bits' per-word
and per-character motion (Blur Text, Decrypted Text) and gsap's Animated Content. They are replaced by CSS (`.lp-word`,
`.lp-reveal`, `.lp-bar` in landing.css) and removed with gsap; Wappi's avatar loads through `next/dynamic` in both apps.

## R2 (scoped, sonnet; package `--since 32771d2`)

All open findings addressed; the performance pass broke none of them. Verdict: ship. One Minor (two imports from
`@/i18n/routing` in `layout.tsx`) merged after the round. Also fixed after it: the hero `<h1>` read "tiền,chỉ" (no space
between its two flex lines).

Verify: `pnpm check` 17/17, skills mirror and routing identical. Lighthouse (`next build` + `next start`, mobile): landing
vi 80 → 85, en 94; desktop 99–100; dashboard data pages 74–75 mobile (lab LCP 6.7 s, field-like observed 0.8 s), 95 desktop.
