import type { NextResponse } from "next/server"

import type { Role } from "./permissions"

/** Per-app settings. Each app has its own cookie so web and admin sessions stay apart (both run on localhost in dev). */
export type AuthOptions = { cookieName: string }

/**
 * Provider-agnostic session. `accessToken` goes to FastAPI as Bearer. `role` comes
 * from a source the user cannot edit; it drives UI and early checks, and the backend still authorizes every call.
 */
export type Session = {
  userId: string
  accessToken: string
  role: Role
  name: string | null
  email: string | null
  /** Set when the provider copies the calendar preferences into the token (saves a settings read). */
  calendar?: Calendar
}

/**
 * Base seam (docs/providers.md §5): timezone (IANA), week start (0 = Sunday .. 6 = Saturday) and an
 * adoption date (`YYYY-MM-DD`) a Keycloak token mapper may copy into the token.
 */
export type Calendar = {
  timezone: string
  weekStart: number
  adoptedOn: string
}

/** Server-side contract (Server Components, Server Actions, Route Handlers). */
export interface AuthProvider {
  /** Verified session, or null. Must not refresh tokens (the proxy does that). */
  getSession(): Promise<Session | null>
  /**
   * Like `getSession`, but also asks the Auth server whether the session is still valid (not revoked).
   * Use before sensitive actions.
   */
  verifySessionFresh(): Promise<Session | null>
  signOut(): Promise<void>
  /**
   * Reissues the token so the claims copied from user data (`calendar`) are current. Call it from the Server
   * Action that changed that data.
   */
  refreshSession(): Promise<void>
  /** True when the failure is the Auth server's answer (safe to show), not an outage (rethrow). */
  isExpectedError(error: unknown): boolean
  /** Google sign-in through Keycloak (`kc_idp_hint=google`, PKCE redirect flow). */
  oauth: {
    /** Returns the URL to send the browser to. */
    start(redirectTo: string): Promise<string>
    /** Completes the flow on the callback route. Throws on failure. */
    exchangeCode(code: string, state?: string | null): Promise<void>
  }
}

export type ProxyAuthResult = {
  /** Response to return from `proxy.ts` (carries refreshed cookies). */
  response: NextResponse
  /** Optimistic: a session exists. Real authorization is done in the DAL. */
  isAuthenticated: boolean
  /** Role from the token, `null` when signed out. Optimistic, like `isAuthenticated`. */
  role: Role | null
}
