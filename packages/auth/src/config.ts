import { z } from "zod"

/**
 * Auth environment (docs/providers.md): the only supported `AUTH_PROVIDER` is `keycloak`; any other value fails.
 * Not `server-only` so `proxy.ts` can read it; client components must not import it (ESLint rule).
 */
export function getAuthSchema(isProd = process.env.NODE_ENV === "production") {
  return z.object({
    AUTH_PROVIDER: z.literal("keycloak"),
    KEYCLOAK_ISSUER: z.url().default("http://localhost:11095/realms/wattprint"),
    KEYCLOAK_CLIENT_ID: z.string().min(1).default("wattprint-web"),
    KEYCLOAK_CLIENT_SECRET: isProd
      ? z.string().min(1, "KEYCLOAK_CLIENT_SECRET is required in production")
      : z
          .string()
          .min(
            1,
            "KEYCLOAK_CLIENT_SECRET is required (WATTPRINT_WEB_CLIENT_SECRET of wattprint-fastapi/.env)"
          ),
  })
}

export const authSchema = getAuthSchema()
export type AuthConfig = z.infer<ReturnType<typeof getAuthSchema>>

export function parseAuthConfig(
  env: Record<string, string | undefined> = process.env
): AuthConfig {
  const isBuildPhase =
    env.NEXT_PHASE === "phase-production-build" ||
    env.SKIP_ENV_VALIDATION === "true" ||
    env.SKIP_ENV_VALIDATION === "1"
  const isProd = env.NODE_ENV === "production" && !isBuildPhase
  return getAuthSchema(isProd).parse({
    AUTH_PROVIDER: env.AUTH_PROVIDER || "keycloak",
    KEYCLOAK_ISSUER: env.KEYCLOAK_ISSUER,
    KEYCLOAK_CLIENT_ID: env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET: env.KEYCLOAK_CLIENT_SECRET,
  })
}

export const authConfig: AuthConfig = parseAuthConfig()
