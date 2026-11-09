# Authentication & Data Access Layer (DAL)

## 1. When to Use
Use when checking user sessions, protecting endpoints, or making authorized backend calls.

## 2. Architecture & Call Paths
- **`proxy.ts`**: Optimistic check & token refresh only. Writes refreshed cookies to request and response.
- **`lib/dal.ts`**: System-of-record authorization. Exports `getSession()`, `verifySession()`, `verifySessionFresh()`.
- **`lib/http.ts`**: Injects Bearer token from session; throws `ApiError` on non-2xx. A 401 ends the session.

## 3. Canonical Pattern

```ts
// In queries or actions:
import { verifySession } from "@/lib/dal"

export async function getUserItems() {
  const session = await verifySession() // Redirects to /auth/expired if unauthenticated
  return fetchItems(session.accessToken)
}
```

`getSession()` in `lib/dal.ts` is `"use cache: private"`: every private query in a request joins one session read (`React.cache` would run once per cache scope), and the token expiry check runs per request, never in the static shell.

## 4. Role and Permission Checks
`Session` is `{ userId, accessToken, role, name, email, calendar? }`. `role` comes from verified claims only (Keycloak roles in the access token); check it with `requirePermission()` from every `queries.ts` and `actions.ts` that touches the protected data (Server Actions are public endpoints, so a page-level check does not cover them). Hiding a nav link is a UI hint, not authorization.

`calendar` (timezone, week start, adoption date) is set only when the provider carries them in the token; read them through `getCalendar()` (falls back to the settings read). An action that changes them calls `refreshSessionClaims()` after the write, or other pages keep the old values until the token refreshes.

## 5. Never Do
- ❌ **Never treat `proxy.ts` as the authorization boundary**: it is an optimistic redirect for unauthenticated users. The real check is `verifySession()` in the data path.
- ❌ **Never authorize in `layout.tsx`**: Layouts do not re-render on sub-navigation. Always authorize close to the data in `queries.ts` or `actions.ts`.
- ❌ **Never attempt to write cookies in Server Components**: Cookies can only be mutated in `proxy.ts`, Server Actions, or Route Handlers.

## 6. Source of Truth (Deep Dive)
- Flow, files and exports: [docs/authentication.md](../../../../docs/authentication.md)
- The Keycloak + FastAPI stack, env and rules: [docs/providers.md](../../../../docs/providers.md)
