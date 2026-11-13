# Internationalization (vi / en)

Both apps (`apps/dashboard`, `apps/web`) are Vietnamese first, with English under `/en`.
Built on **next-intl 4** and Next.js 16.4 root params, so pages stay statically prerenderable under `cacheComponents`.

## Routing

| URL | Language |
| :--- | :--- |
| `/dashboard`, `/sign-in`, `/` | Vietnamese (default, no prefix) |
| `/en/dashboard`, `/en/sign-in`, `/en` | English |
| `/vi/...` | redirects to the unprefixed path |

- `i18n/routing.ts` (one per app, keep them identical): `locales: ["vi", "en"]`, `localePrefix: "as-needed"`, `localeDetection: false` (the URL alone decides; no Accept-Language guess).
- The root layout is `app/[locale]/layout.tsx`; it reads the language with `locale()` from `next/root-params` and lists both locales in `generateStaticParams`. Reading a cookie there instead would block every segment under Cache Components (`DOCS/02-guides/preventing-flash-before-hydration.md`).
- `proxy.ts` runs next-intl's middleware, which rewrites unprefixed paths to `/vi/...`. In the dashboard it runs after the session refresh and carries the session's cookies onto its response; redirects to sign-in / dashboard keep the prefix.
- Route Handlers (`app/auth/*`) live outside `[locale]` and are not localized; they pick the language from next-intl's `NEXT_LOCALE` cookie (`i18n/cookie-locale.ts`) for their redirects.
- Unknown paths hit `app/[locale]/[...rest]/page.tsx`, which calls `notFound()` so `[locale]/not-found.tsx` renders inside the localized layout.
- Multi-zone: `apps/web/next.config.ts` rewrites both `/<path>` and `/en/<path>` for the dashboard's paths; `apps/web/proxy.ts` skips them. Links from the landing into the dashboard use `dashboardHref(path, locale)`.

## Writing UI text

- Never hardcode user-visible text. Add it to `messages/{vi,en}/<namespace>.json` (one file per namespace: a feature, `layout`, `auth`, `common`), then `useTranslations("ns")` (sync components, server or client) or `await getTranslations("ns")` (async components, `generateMetadata`, Server Actions).
- `messages/en.ts` must satisfy the type of `messages/vi.ts`, and keys are type-checked (`i18n/global.d.ts`): a missing key or a missing English entry fails `tsc`.
- Links and navigation: `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` from `@/i18n/navigation`, not from `next/link` / `next/navigation` (they would drop `/en`). `notFound`/`forbidden` stay from `next/navigation`.
- Numbers, currency and dates: format with the current locale (`useLocale()` / `getLocale()`), never a hardcoded `"en-US"` or the browser default (hydration mismatch). Vietnamese currency reads `2.380 ₫`.
- Hairline UI's built-in strings (e.g. ShareBar's "Collapse", aria text) are translated by patches in `packages/ui/hairline/patch.mjs` that wrap them in `useHairlineText()`; the Vietnamese table is `packages/ui/src/lib/hairline-messages.ts`, keyed by the English text. When a Hairline update adds a visible string, add a patch and a table entry.
- The language switch (`LocaleSwitch`, VI | EN) sits in the dashboard's account menu and the landing header.
