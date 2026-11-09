import { exportJWK, generateKeyPair, SignJWT } from "jose"
import { createLocalJWKSet } from "jose"
import { describe, expect, it } from "vitest"

import { getKeycloakCookieNames, parsePkceCookie } from "../keycloak/cookies"
import { resolveKeycloakRole, verifyKeycloakJwt } from "../keycloak/jwks"
import {
  buildAuthorizationUrl,
  createPkceChallenge,
  getKeycloakEndpoints,
} from "../keycloak/oidc"

describe("keycloak cookies & PKCE parsing", () => {
  it("derives split cookie names from the app cookie prefix", () => {
    expect(getKeycloakCookieNames("nmb-dashboard-auth")).toEqual({
      access: "nmb-dashboard-auth.access",
      refresh: "nmb-dashboard-auth.refresh",
      id: "nmb-dashboard-auth.id",
      pkce: "nmb-dashboard-auth.pkce",
    })
  })

  it("returns null for malformed or incomplete PKCE cookie payloads", () => {
    expect(parsePkceCookie(undefined)).toBeNull()
    expect(parsePkceCookie("not-json")).toBeNull()
    expect(parsePkceCookie(JSON.stringify({ state: "s" }))).toBeNull()
    expect(
      parsePkceCookie(
        JSON.stringify({
          state: "s1",
          codeVerifier: "v1",
          redirectUri: "http://localhost:3001/auth/callback",
        })
      )
    ).toEqual({
      state: "s1",
      codeVerifier: "v1",
      redirectUri: "http://localhost:3001/auth/callback",
    })
  })
})

describe("resolveKeycloakRole & verifyKeycloakJwt", () => {
  it("picks highest privilege when default realm roles coexist with admin/editor", () => {
    expect(
      resolveKeycloakRole({
        realm_access: {
          roles: ["default-roles-dashboard", "customer", "admin"],
        },
      })
    ).toBe("admin")
    expect(
      resolveKeycloakRole({
        roles: ["customer", "editor"],
      })
    ).toBe("editor")
    expect(resolveKeycloakRole({})).toBe("customer")
  })

  it("verifies a signed RS256 token and extracts claims and calendar", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256")
    const jwk = await exportJWK(publicKey)
    jwk.kid = "k1"
    jwk.alg = "RS256"
    jwk.use = "sig"
    const jwks = createLocalJWKSet({ keys: [jwk] })
    const issuer = "http://localhost:8080/realms/dashboard"

    const token = await new SignJWT({
      email: "admin@next-mono-base.local",
      name: "Admin User",
      realm_access: { roles: ["customer", "admin"] },
      timezone: "Asia/Ho_Chi_Minh",
      week_start: 1,
      adopted_on: "2026-01-01",
    })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setSubject("user-123")
      .setIssuer(issuer)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey)

    const verified = await verifyKeycloakJwt(token, issuer, jwks)
    expect(verified).toMatchObject({
      userId: "user-123",
      role: "admin",
      name: "Admin User",
      email: "admin@next-mono-base.local",
      calendar: {
        timezone: "Asia/Ho_Chi_Minh",
        weekStart: 1,
        adoptedOn: "2026-01-01",
      },
    })
  })

  it("rejects token with mismatched azp or invalid typ", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256")
    const jwk = await exportJWK(publicKey)
    jwk.kid = "k2"
    jwk.alg = "RS256"
    jwk.use = "sig"
    const jwks = createLocalJWKSet({ keys: [jwk] })
    const issuer = "http://localhost:8080/realms/dashboard"

    // Mismatched azp
    const wrongAzpToken = await new SignJWT({
      azp: "other-client",
      typ: "Bearer",
    })
      .setProtectedHeader({ alg: "RS256", kid: "k2" })
      .setSubject("user-456")
      .setIssuer(issuer)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey)

    expect(
      await verifyKeycloakJwt(wrongAzpToken, issuer, {
        clientId: "dashboard-app",
        jwksOverride: jwks,
      })
    ).toBeNull()

    // Invalid typ (e.g. Refresh token used as Access token)
    const wrongTypToken = await new SignJWT({
      azp: "dashboard-app",
      typ: "Refresh",
    })
      .setProtectedHeader({ alg: "RS256", kid: "k2" })
      .setSubject("user-456")
      .setIssuer(issuer)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey)

    expect(
      await verifyKeycloakJwt(wrongTypToken, issuer, {
        clientId: "dashboard-app",
        jwksOverride: jwks,
      })
    ).toBeNull()

    // Valid azp and typ passes
    const validToken = await new SignJWT({
      azp: "dashboard-app",
      typ: "Bearer",
      resource_access: { "dashboard-app": { roles: ["editor"] } },
    })
      .setProtectedHeader({ alg: "RS256", kid: "k2" })
      .setSubject("user-456")
      .setIssuer(issuer)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey)

    const verified = await verifyKeycloakJwt(validToken, issuer, {
      clientId: "dashboard-app",
      jwksOverride: jwks,
    })
    expect(verified).not.toBeNull()
    expect(verified?.role).toBe("editor")
  })
})

describe("required claims", () => {
  it("rejects a token without azp or without exp", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256")
    const jwk = await exportJWK(publicKey)
    jwk.kid = "k3"
    jwk.alg = "RS256"
    jwk.use = "sig"
    const jwks = createLocalJWKSet({ keys: [jwk] })
    const issuer = "http://localhost:8080/realms/dashboard"
    const options = { clientId: "dashboard-app", jwksOverride: jwks }

    const noAzp = await new SignJWT({ typ: "Bearer" })
      .setProtectedHeader({ alg: "RS256", kid: "k3" })
      .setSubject("user-789")
      .setIssuer(issuer)
      .setExpirationTime("5m")
      .sign(privateKey)
    expect(await verifyKeycloakJwt(noAzp, issuer, options)).toBeNull()

    const noExp = await new SignJWT({ azp: "dashboard-app", typ: "Bearer" })
      .setProtectedHeader({ alg: "RS256", kid: "k3" })
      .setSubject("user-789")
      .setIssuer(issuer)
      .sign(privateKey)
    expect(await verifyKeycloakJwt(noExp, issuer, options)).toBeNull()
  })
})

describe("OIDC URL builder", () => {
  it("builds the Google idp hint URL with S256 PKCE", () => {
    const pkce = createPkceChallenge()
    const cfg = {
      issuer: "http://localhost:8080/realms/dashboard",
      clientId: "dashboard-app",
      clientSecret: "secret",
    }
    const url = new URL(
      buildAuthorizationUrl(cfg, {
        redirectUri: "http://localhost:3001/auth/callback",
        state: pkce.state,
        codeChallenge: pkce.codeChallenge,
      })
    )
    expect(url.pathname).toBe("/realms/dashboard/protocol/openid-connect/auth")
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")
    expect(url.searchParams.get("kc_idp_hint")).toBe("google")

    expect(getKeycloakEndpoints(cfg.issuer).certs).toBe(
      "http://localhost:8080/realms/dashboard/protocol/openid-connect/certs"
    )
  })
})
