# Provider: Keycloak + FastAPI

The dashboard supports one stack: `AUTH_PROVIDER=keycloak`. Any other value fails at startup (`@workspace/auth/config`).

| Piece | Value |
| :--- | :--- |
| Identity | Keycloak realm `wattprint` of the sibling `wattprint-fastapi` project (`docker compose up -d keycloak` there) |
| Client | `wattprint-web` (confidential; secret = `WATTPRINT_WEB_CLIENT_SECRET` of `wattprint-fastapi/.env`) |
| Sign-in | Email + password on Keycloak's login page, or Google (`kc_idp_hint=google` skips the page). The page is the WattPrint theme from `apps/keycloak-theme`. `ui_locales` carries the dashboard's language. Sign-up (email as username), email verification and password reset are Keycloak's own flows, also themed; their mail goes through the realm's SMTP (dev: Mailpit in wattprint-backend, inbox http://localhost:11099). New users get the `user` role (realm default roles), like Google users |
| Data | FastAPI (`API_BASE_URL`). The Keycloak access token goes to it as `Authorization: Bearer`; FastAPI verifies it against the realm JWKS. FastAPI issues no JWT of its own |

## Environment (`apps/dashboard/.env.example`)

```
AUTH_PROVIDER=keycloak
KEYCLOAK_ISSUER=http://localhost:11095/realms/wattprint
KEYCLOAK_CLIENT_ID=wattprint-web
KEYCLOAK_CLIENT_SECRET=<required>
API_BASE_URL=http://localhost:11093/api/v1
OPENWEATHER_API_KEY=            # optional: the Overview's weather card (unset: no card)
WEATHER_LAT=21.0285             # optional: where the weather is for (default Hanoi)
WEATHER_LON=105.8542
```

`KEYCLOAK_CLIENT_SECRET` is required (also during `next build`; CI uses a placeholder). Every variable read at build time must also be listed in `turbo.json` (`build.env`).

## Seams

- `AuthProvider` (`packages/auth/src/types.ts`): `getSession`, `verifySessionFresh`, `signOut`, `refreshSession`, `isExpectedError` and `oauth.{start, exchangeCode}`. The only implementation is `packages/auth/src/keycloak/`.
- `Session.role` comes from the verified token (`role`, `realm_access.roles` or the client's `resource_access` roles), never from user-editable data. Unknown or missing means `customer`.
- Optional token claims `timezone`, `week_start`, `adopted_on` (a Keycloak mapper) become `Session.calendar`.
- Feature data: `features/<name>/server.ts` calls `apiFetch(path, { token: session.accessToken })` (`lib/http.ts`). A `4xx` is an `ApiError`; a `401` from FastAPI sends the user to `/auth/expired`, which clears the cookies and returns to sign-in.

## Rules

- Tokens live in `httpOnly` cookies `<cookieName>.{access,refresh,id}`; only `proxy.ts` refreshes them (a refresh outage keeps the cookies and retries on the next request; only a rejected refresh token ends the session).
- The PKCE verifier lives in a 10 minute cookie named after the login `state`, so two tabs can sign in at once.
- Content-Security-Policy `form-action` allows the Keycloak origin and `accounts.google.com` (the redirect chain after the sign-in form).
- Keycloak's pages are never built by hand in Keycloak: edit `apps/keycloak-theme` (React, Hairline, the same tokens), then `pnpm --filter keycloak-theme build:jar` (needs Java and Maven) copies the jar into `wattprint-backend/keycloak/providers/`; restart Keycloak. `pnpm --filter keycloak-theme dev` previews pages with mock data (`/?page=login.ftl&lang=en&error=1`).
- Post-logout redirect URIs of the `wattprint-web` client must list every localized sign-in path (`/sign-in` and `/en/sign-in`), or Keycloak rejects the English sign-out.
