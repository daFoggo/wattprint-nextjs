/** Path prefixes that require a session (optimistic check in `proxy.ts`). */
export const PROTECTED_PREFIXES = ["/dashboard"] as const

export const SIGN_IN_PATH = "/sign-in"
/** Pages a signed-in user is redirected away from (optimistic check in `proxy.ts`). */
export const AUTH_PAGES = [SIGN_IN_PATH] as const
export const DASHBOARD_PATH = "/dashboard"
export const OAUTH_CALLBACK_PATH = "/auth/callback"
/**
 * Clears the session cookie, then goes to sign-in. Used when the backend rejects a token
 * and when the DAL finds no usable session, which also breaks any proxy/DAL redirect loop.
 */
export const SESSION_EXPIRED_PATH = "/auth/expired"
