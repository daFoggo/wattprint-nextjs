import "server-only"

import { createKeycloakProvider } from "./keycloak/server"
import type { AuthOptions, AuthProvider } from "./types"

/** The Keycloak provider (docs/providers.md) bound to one app's cookie. */
export async function getAuthProvider(
  options: AuthOptions
): Promise<AuthProvider> {
  return createKeycloakProvider(options)
}
