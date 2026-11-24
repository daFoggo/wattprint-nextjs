/** Path prefixes that require a session (optimistic check in `proxy.ts`). */
export const PROTECTED_PREFIXES = ["/dashboard"] as const

export const SIGN_IN_PATH = "/sign-in"
/** Pages a signed-in user is redirected away from (optimistic check in `proxy.ts`). */
export const AUTH_PAGES = [SIGN_IN_PATH] as const
export const DASHBOARD_PATH = "/dashboard"
export const BILL_PATH = "/dashboard/bill"
export const SETTINGS_PATH = "/dashboard/settings"
export const STATISTICS_PATH = "/dashboard/statistics"
export const DEVICES_PATH = "/dashboard/devices"
export const ALERTS_PATH = "/dashboard/alerts"
export const PLAN_PATH = "/dashboard/plan"
export const PLAN_HISTORY_PATH = "/dashboard/plan/history"
export const planPath = (id: string) => `${PLAN_PATH}/${encodeURIComponent(id)}`
export const COPILOT_PATH = "/dashboard/copilot"
export const onCopilotPage = (pathname: string) =>
  pathname === COPILOT_PATH || pathname.startsWith(`${COPILOT_PATH}/`)
export const OAUTH_CALLBACK_PATH = "/auth/callback"
/**
 * Clears the session cookie, then goes to sign-in. Used when the backend rejects a token
 * and when the DAL finds no usable session, which also breaks any proxy/DAL redirect loop.
 */
export const SESSION_EXPIRED_PATH = "/auth/expired"
