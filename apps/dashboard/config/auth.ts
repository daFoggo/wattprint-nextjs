import type { AuthOptions } from "@workspace/auth/types"

/** The dashboard's own session cookie. */
export const AUTH_OPTIONS = {
  cookieName: "nmb-dashboard-auth",
} as const satisfies AuthOptions
