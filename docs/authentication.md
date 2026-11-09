# Authentication

How the dashboard (`apps/dashboard`; `apps/web` is a public landing page with no session) signs users in. The code lives in
`packages/auth` (`@workspace/auth`). Stack, variables and rules: [providers.md](providers.md). Applies to Next.js 16.4 with Cache Components.

## 1. Flow

One provider: Keycloak (OIDC, authorization code + PKCE) with Google as the only identity provider.

```
/sign-in "Continue with Google" ─ signInWithKeycloakAction ─▶ Keycloak (kc_idp_hint=google) ─▶ Google
        ◀─ /auth/callback?code&state ─ oauth.exchangeCode ─▶ cookies <name>.{access,refresh,id}

Browser ─cookie─▶ proxy.ts ─▶ updateSession: verify access token (JWKS), refresh when < 60 s left
                     ▼
   Server Component / Action ─▶ lib/dal.ts (getSession · verifySession · verifySessionFresh · requirePermission)
                     ▼
         apiFetch ─Bearer access token─▶ FastAPI (/v1/*)
```

Principles:

1. **No network call to learn who the user is**: the access token is verified locally against cached JWKS (issuer, `exp`, `typ=Bearer`, `azp` = client id).
2. **Tokens are refreshed in `proxy.ts` only**: Server Components cannot write cookies.
3. **Authorize next to the data** (DAL, Server Actions), not in layouts; `proxy.ts` only redirects optimistically.
4. **Server Actions are public endpoints**: each authenticates and validates its own input.
5. **Per-user data uses `"use cache: private"`**; secrets never become cache keys or tags. `getSession()` is private too, so a request reads the session once.

## 2. Where things are

In `apps/dashboard/` unless they start with `packages/`:
- `proxy.ts`: `updateSession(request, AUTH_OPTIONS)` from `@workspace/auth/proxy`; `redirectWithSession` keeps refreshed cookies on redirects.
- `config/auth.ts`: `AUTH_OPTIONS` (cookie name `nmb-dashboard-auth`); `lib/auth.ts`: `getAuthProvider()` bound to it.
- `features/auth/actions.ts`: `signInWithKeycloakAction` (starts the flow) and `signOutAction`. `app/auth/callback/route.ts` finishes it; `app/auth/expired/route.ts` clears a rejected session.
- Refresh-token rotation is on in the realm: `refreshKeycloakTokens` is single-flight per refresh token (in-process; several instances need a shared lock or sticky sessions). A failed refresh is not replayed.
- Sign-out is RP-initiated: `signOutAction` redirects to Keycloak's end-session URL (`id_token_hint`, `post_logout_redirect_uri` = `/sign-in`, registered on the client); cookies are cleared either way. Without an id cookie it falls back to a back-channel logout.
- `features/auth/components`: `GoogleSignInButton`, `SignOutMenuItem`, `FormError` (they hold no logic; the Server Action is a prop).
- `lib/http.ts`: `apiFetch` sends the Bearer token to FastAPI (`API_BASE_URL`).
- `packages/auth/src/keycloak/{server,proxy,oidc,jwks,cookies}.ts`: the provider, the proxy refresh, OIDC calls, token verification and cookie names.

| Export | What it gives |
| :--- | :--- |
| `@workspace/auth/config` | `authConfig` (not `server-only`; the proxy reads it) |
| `@workspace/auth/server` | `getAuthProvider(options)` (`server-only`) |
| `@workspace/auth/proxy` | `updateSession(request, options)`, `redirectWithSession(url, session)` |
| `@workspace/auth/permissions` | `Role`, `hasPermission`, `parseRole`, `isStaff` |
| `@workspace/auth/types` | `Session`, `AuthProvider`, `AuthOptions` |

**One cookie per app.** `AuthOptions.cookieName` prefixes the token cookies. A second app picks its own name, because apps share `localhost` in dev.

**Roles.** `customer` (default and fallback), `editor` (content and records, may open a staff area), `admin` (editor plus settings and staff). They come from the Keycloak realm roles in the token; a role change applies after the token refreshes (sign out and back in to see it at once).

## 3. FastAPI side

FastAPI verifies the same Keycloak access token against the realm JWKS (`iss`, `exp`, audience); it issues no token itself.
