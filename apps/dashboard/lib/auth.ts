import "server-only"

import { getAuthProvider as getProvider } from "@workspace/auth/server"
import type { AuthProvider } from "@workspace/auth/types"

import { AUTH_OPTIONS } from "@/config/auth"

export type { Calendar, Session } from "@workspace/auth/types"

/** The Keycloak provider (docs/providers.md) bound to the dashboard cookie. */
export function getAuthProvider(): Promise<AuthProvider> {
  return getProvider(AUTH_OPTIONS)
}
