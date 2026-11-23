---
paths:
  - "packages/auth/**"
  - "apps/dashboard/proxy.ts"
  - "apps/dashboard/lib/{dal,http,env,auth}.ts"
  - "apps/dashboard/config/auth.ts"
  - "apps/dashboard/app/auth/**"
  - "apps/keycloak-theme/**"
---

# Auth: rules an agent must not miss

Source of truth: docs/authentication.md and docs/providers.md. These paths are lane L (riskyPaths).

- Tokens are refreshed in `proxy.ts` only; the access token is verified locally against JWKS, no network call per request.
- `Session.role` comes from the verified token, never user-editable data; unknown means `customer`.
- One cookie name per app (`AuthOptions.cookieName`). Only the DAL and `lib/env.ts` read secrets.
- Keycloak pages change only in `apps/keycloak-theme`, then `pnpm --filter keycloak-theme build:jar`.
- Post-logout redirect URIs list both `/sign-in` and `/en/sign-in`. A build-time env var also goes in `turbo.json` `build.env`.
