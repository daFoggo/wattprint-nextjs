import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const isDev = process.env.NODE_ENV === "development"

/**
 * Content-Security-Policy without nonces: nonces force dynamic rendering of every page
 * and are incompatible with Partial Prerendering (docs: guides/content-security-policy).
 * The landing page makes no API calls and submits no forms.
 */
function contentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]
  // Upgrading to https would break http://localhost during development.
  if (!isDev) directives.push("upgrade-insecure-requests")
  return directives.join("; ")
}

/** Paths owned by apps/dashboard (multi-zone): proxied there so landing and dashboard share one domain. */
const DASHBOARD_PATHS = [
  "sign-in",
  "dashboard",
  "auth",
] as const

// Turbopack compiles workspace packages (e.g. @workspace/ui) automatically,
// so `transpilePackages` is not needed here.
const nextConfig: NextConfig = {
  // Recommended for all new apps from Next.js 16.4 (default in create-next-app).
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    optimizePackageImports: ["@tabler/icons-react"],
  },
  async rewrites() {
    const origin = process.env.DASHBOARD_ORIGIN ?? "http://localhost:11092"
    // beforeFiles: Vercel resolves segment prefetches (`.segments`) before the afterFiles rewrites run.
    // The English pages live under /en (next-intl, `localePrefix: "as-needed"`) in both apps.
    const beforeFiles = [
      ...DASHBOARD_PATHS.flatMap((p) => [p, `en/${p}`]).flatMap((path) => [
        { source: `/${path}`, destination: `${origin}/${path}` },
        { source: `/${path}/:rest*`, destination: `${origin}/${path}/:rest*` },
        // Segment prefetches (partialPrefetching) ask for `/<path>.segments/...`.
        {
          source: `/${path}.segments/:rest*`,
          destination: `${origin}/${path}.segments/:rest*`,
        },
      ]),
      {
        source: "/dashboard-static/:path+",
        destination: `${origin}/dashboard-static/:path+`,
      },
    ]
    return { beforeFiles }
  },
  async headers() {
    return [
      {
        // Not the dashboard paths: they answer with their own CSP.
        source: `/((?!(?:en/)?(?:${[...DASHBOARD_PATHS, "dashboard-static"].join("|")})(?:/|\\.segments|$)).*)`,
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
}

export default createNextIntlPlugin("./i18n/request.ts")(nextConfig)
