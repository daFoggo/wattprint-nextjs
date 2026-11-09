# lib/

App infrastructure, not tied to one feature. Server-only modules start with `import "server-only"`.

- `env.ts` / `env.public.ts`: validated env (server-only / browser-safe).
- `http.ts`: backend `fetch` wrapper (only feature `server.ts` files import it). A `401` on a token ends the session
  (`endRejectedSession`).
- `errors.ts`: `ApiError`, `isExpectedDataError` (backend `4xx`: return from actions as a value), `ruleOf`, `getErrorMessage`.
- `dal.ts`: Data Access Layer: `getSession` (`"use cache: private"`, one read per request), `verifySession`,
  `refreshSessionClaims` (after a write that changes a token claim). Call next to the data.
- `auth.ts`: `getAuthProvider()`, the `@workspace/auth` provider bound to this app's cookie (`config/auth.ts`).
  **Keycloak only** (`AUTH_PROVIDER=keycloak`, docs/providers.md). The adapter
  (`keycloak/`), the auth env (`@workspace/auth/config`) and the proxy refresh
  (`@workspace/auth/proxy`, the **only** place that refreshes tokens) live in `packages/auth`.
