import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  refresh: (async () => {
    throw new Error("unset")
  }) as () => Promise<unknown>,
  keycloakClaims: null as null | { userId: string; role: string; exp: number },
}))

vi.mock("../keycloak/oidc", async (importActual) => ({
  ...(await importActual<typeof import("../keycloak/oidc")>()),
  refreshKeycloakTokens: () => state.refresh(),
}))
vi.mock("../keycloak/jwks", () => ({
  verifyKeycloakJwt: async () => state.keycloakClaims,
}))

const { KeycloakTokenError } = await import("../keycloak/oidc")
const { updateSession } = await import("../keycloak/proxy")

const now = () => Math.floor(Date.now() / 1000)

function request(cookies: Record<string, string>) {
  return new NextRequest("http://localhost:11091/dashboard", {
    headers: {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; "),
    },
  })
}

const OPTIONS = { cookieName: "app" }
const cookies = (access: boolean) => ({
  ...(access ? { "app.access": "a" } : {}),
  "app.refresh": "r",
})

describe("keycloak refresh", () => {
  beforeEach(() => {
    state.keycloakClaims = { userId: "u1", role: "customer", exp: now() + 30 }
  })

  it("keeps the cookies and a still-valid token during an outage", async () => {
    state.refresh = async () => {
      throw new TypeError("fetch failed")
    }
    const result = await updateSession(request(cookies(true)), OPTIONS)
    expect(result.isAuthenticated).toBe(true)
    expect(result.response.cookies.getAll()).toEqual([])
  })

  it("keeps the cookies but reports signed out when no token is left", async () => {
    state.keycloakClaims = null
    state.refresh = async () => {
      throw new TypeError("fetch failed")
    }
    const result = await updateSession(request(cookies(false)), OPTIONS)
    expect(result.isAuthenticated).toBe(false)
    expect(result.response.cookies.getAll()).toEqual([])
  })

  it("treats a 5xx like an outage", async () => {
    state.refresh = async () => {
      throw new KeycloakTokenError(503, "down")
    }
    const result = await updateSession(request(cookies(false)), OPTIONS)
    expect(result.isAuthenticated).toBe(false)
    expect(result.response.cookies.getAll()).toEqual([])
  })

  it("clears the cookies when the refresh token is rejected", async () => {
    state.refresh = async () => {
      throw new KeycloakTokenError(400, "invalid_grant", "invalid_grant")
    }
    const result = await updateSession(request(cookies(true)), OPTIONS)
    expect(result.isAuthenticated).toBe(false)
    expect(result.response.cookies.get("app.refresh")?.value).toBe("")
  })

  it("keeps the cookies on invalid_client (deployment mistake)", async () => {
    state.refresh = async () => {
      throw new KeycloakTokenError(401, "bad secret", "invalid_client")
    }
    const result = await updateSession(request(cookies(true)), OPTIONS)
    expect(result.response.cookies.get("app.refresh")?.value).not.toBe("")
  })
})
