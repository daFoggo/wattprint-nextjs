import { describe, expect, it } from "vitest"

import { parseAuthConfig } from "../config"

describe("parseAuthConfig", () => {
  it("uses the local realm defaults in development/test", () => {
    const config = parseAuthConfig({
      NODE_ENV: "test",
      KEYCLOAK_CLIENT_SECRET: "s",
    })
    expect(config).toMatchObject({
      AUTH_PROVIDER: "keycloak",
      KEYCLOAK_ISSUER: "http://localhost:8180/realms/wattprint",
      KEYCLOAK_CLIENT_ID: "wattprint-web",
    })
  })

  it("rejects any provider but keycloak", () => {
    for (const AUTH_PROVIDER of [
      "neon-auth",
      "supabase",
      "demo",
      "fastapi-oauth",
    ]) {
      expect(() =>
        parseAuthConfig({ AUTH_PROVIDER, KEYCLOAK_CLIENT_SECRET: "s" })
      ).toThrow()
    }
  })

  it("fails in production if KEYCLOAK_CLIENT_SECRET is omitted", () => {
    expect(() => parseAuthConfig({ NODE_ENV: "production" })).toThrow()
  })

  it("succeeds in production when the secret is supplied", () => {
    expect(
      parseAuthConfig({
        NODE_ENV: "production",
        KEYCLOAK_CLIENT_SECRET: "my-production-secret-value-long-enough",
      }).KEYCLOAK_CLIENT_SECRET
    ).toBe("my-production-secret-value-long-enough")
  })
})
