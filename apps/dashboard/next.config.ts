import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

/**
 * Content-Security-Policy without nonces: nonces force dynamic rendering of every page
 * and are incompatible with Partial Prerendering (docs: guides/content-security-policy).
 */
function contentSecurityPolicy(): string {
  // The redirect chain after the sign-in form ends at Google (kc_idp_hint=google).
  const formActions = ["'self'", "https://accounts.google.com"]
  // Keycloak OIDC sends the browser to the Keycloak realm auth endpoint.
  const keycloakIssuer =
    process.env.KEYCLOAK_ISSUER || "http://localhost:11095/realms/wattprint"
  formActions.push(new URL(keycloakIssuer).origin)

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action ${formActions.join(" ")}`,
    "frame-ancestors 'none'",
  ]
  // Upgrading to https would break http://localhost during development.
  if (!isDev) directives.push("upgrade-insecure-requests")
  return directives.join("; ")
}

// Turbopack compiles workspace packages (e.g. @workspace/ui) automatically,
// so `transpilePackages` is not needed here.
const nextConfig: NextConfig = {
  // Multi-zone: apps/web serves this app under its own domain (rewrites in apps/web/next.config.ts), so its assets need their own prefix.
  assetPrefix: "/dashboard-static",
  // Recommended for all new apps from Next.js 16.4 (default in create-next-app).
  cacheComponents: true,
  partialPrefetching: true,
  // Enables forbidden() / forbidden.tsx, used by requirePermission() in lib/dal.ts.
  experimental: {
    authInterrupts: true,
    // Behind the landing domain the browser Origin is that domain, not this app's host.
    serverActions: {
      allowedOrigins: process.env.NEXT_PUBLIC_APP_URL
        ? [new URL(process.env.NEXT_PUBLIC_APP_URL).host]
        : [],
    },
    optimizePackageImports: ["@tabler/icons-react"],
    // Ships the instant() testing API only in a dedicated test build (EXPOSE_TESTING_API=1); never set in deploys.
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
}

export default nextConfig
