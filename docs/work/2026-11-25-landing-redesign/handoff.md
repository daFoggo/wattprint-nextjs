# Handoff: landing rebuild and what is still open (2026-11-25)

Read with `spec.md` (what was built), `review.md` (R1, R1 of the added scope, R2, performance numbers) and `plan.md`.

## Done in this change

- **Landing (apps/web)** rebuilt: CardNav header, centred hero over the real overview capture, bill vs appliances, three
  steps, seven Hairline pill tabs (the dashboard's six pages + Wappi), published findings, an interactive Wappi band
  (auto-demo on first view, three real questions), two-column FAQ, CTA, edge-to-edge RidgeFooter. Copy in the Sense tone,
  no "demo home" wording: data is "real measurements of households in the public REFIT and Plegma datasets".
- **Screens per page, picked by which home tells that page's story**: Plegma House 1 for overview (hero too), appliances,
  Wappi; REFIT House 5 for statistics, alerts, plan, bill. Captured at 1920×1200, 1.5x, in both themes (`tools/capture-demo.mjs`).
  REFIT House 5 was seeded this session (`scripts.seed_demo_homes --house 5`) and its continuous aggregates refreshed.
- **Motion** is CSS where it can be (`.lp-word`, `.lp-reveal`, `.lp-bar`, scroll-driven); React Bits kept: Count Up (bill),
  CardNav (ported). Wappi avatar shared in `@workspace/ui-patterns/wappi`, loaded with `next/dynamic` in both apps.
- **SEO**: per-page titles, canonical + hreflang with x-default, Open Graph/Twitter with `public/og.png`, JSON-LD
  (Organization, SoftwareApplication, FAQPage), fixed sitemap dates, `poweredByHeader: false`, sign-in `noindex`.
- **Sign-in rail** (dashboard `(auth)/_components/auth-frame.tsx` and Keycloak `src/login/components/frame.tsx`): forest
  plate on the new `brand-field` token (globals.css), pitch, three points, the overview capture rising from the bottom.
- **Hairline** updated, Windows fix in `hairline/patch.mjs`, footer label translated through a patch.

## Not done, in priority order

1. **Keycloak theme jar not rebuilt**: `pnpm --filter keycloak-theme build:jar` (needs Maven), then redeploy, or the running
   Keycloak keeps the old email sign-in page.
2. **Deploy env**: production builds must set `NEXT_PUBLIC_APP_URL`, or `robots.ts` disallows everything and canonicals point
   at localhost (`app/robots.ts`, `lib/env.public.ts`). Add a CI check that fails the build without it.
3. **Mobile performance**, Lighthouse on `next build` + `next start`:
   - landing vi 85, en 94 (desktop 99–100). Vietnamese still has about twice the blocking time of English, in React's
     hydration task; not a hydration error and not a cold run (checked). Next step: a CPU profile of `/` vs `/en` with 4x
     throttling to find the component.
   - dashboard data pages 74–75 mobile (lab LCP 6.7 s; observed 0.8 s), 95 desktop. The layout's shared client chunk is
     the cost; next step: split it (sidebar, Wappi entry, copilot provider) so the page's own content paints first.
4. **Dashboard sidebar and page header → Hairline** `sidebar` / `page-header` (installed, unused). Replace the custom
   `components/layout/sidebar/*` and `PageHead`; keep the nav config and the icon rail behaviour (docs/design-system.md §8).
5. **Terms and Privacy pages**: rebuild with Hairline `page-outline` (installed, unused), check the content with
   https://github.com/mhfed/vn-law-check, keep `LAST_UPDATED` in step with `lib/seo.ts` `LAST_EDITED.legal`.
6. **Dashboard bug seen earlier**: a Wappi answer rendered raw markdown (`**bình nóng lạnh**`) in one place.
7. **REFIT device names are English** ("Fridge-Freezer", "Kettle") in the Vietnamese app; name them in
   `wattprint-fastapi/scripts/demo_homes.toml` (Plegma's are Vietnamese) and re-seed, or translate at display.
8. **Font preloads**: the landing preloads 12 Geist files (`packages/ui/src/lib/fonts.ts`); the landing uses two. A per-app
   font set would cut it, but the file is shared with the dashboard.

## Tools (copies of the session's scratch scripts, run from `apps/dashboard` so Playwright resolves)

- `capture-demo.mjs <playwright> <outDir> "<demo home label>" <routes,...> [--light]`: signs in as the demo guest, captures
  routes at 1920×1200 @1.5x; `QUESTION=...` asks Wappi on `/dashboard/copilot`; ticks the first plan item on `/dashboard/plan`.
- `shoot.mjs <playwright> <outDir> <url> [full]`: landing at 1440 and 390, light and dark (scrolls first so lazy images load).
- `cls.mjs <playwright> <url>`: layout shifts on load and while scrolling, with their sources.
- `cookie.mjs <playwright> "<home label>"`: prints the demo guest's Cookie header (for Lighthouse `--extra-headers`). Keep
  the output out of the repo.
- `cut.mjs`: cuts a full-page PNG into screens (needs `SHARP` set to sharp's `dist/index.cjs`).
- `hl.sh <tool> '<json>'`: calls the Hairline MCP over HTTP (`list_components`, `get_component`).

Playwright: `PW=$(node -e "console.log(require.resolve('@playwright/test'))")`, run with `MSYS_NO_PATHCONV=1` in Git Bash.
Lighthouse: `pnpm dlx lighthouse <url> --chrome-flags="--headless=new"` with `CHROME_PATH` set to Playwright's Chromium.
