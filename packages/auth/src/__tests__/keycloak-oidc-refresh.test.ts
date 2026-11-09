import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildEndSessionUrl,
  refreshKeycloakTokens,
  type KeycloakOidcConfig,
} from "../keycloak/oidc"

const config: KeycloakOidcConfig = {
  issuer: "http://kc.test/realms/wattprint",
  clientId: "wattprint-web",
  clientSecret: "s",
}

const ok = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

afterEach(() => vi.restoreAllMocks())

describe("refreshKeycloakTokens", () => {
  it("shares one request between concurrent callers with the same refresh token", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => ok({ access_token: "a2", refresh_token: "r2" }))

    const [a, b] = await Promise.all([
      refreshKeycloakTokens(config, "r-share"),
      refreshKeycloakTokens(config, "r-share"),
    ])
    // A request that arrives just after still gets the answer instead of replaying the spent token.
    const c = await refreshKeycloakTokens(config, "r-share")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect([a.refresh_token, b.refresh_token, c.refresh_token]).toEqual([
      "r2",
      "r2",
      "r2",
    ])
  })

  it("does not replay a failure: the next call asks Keycloak again", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("down", { status: 503 }))
      .mockImplementationOnce(() => ok({ access_token: "a3" }))

    await expect(refreshKeycloakTokens(config, "r-fail")).rejects.toMatchObject(
      { status: 503 }
    )
    await expect(
      refreshKeycloakTokens(config, "r-fail")
    ).resolves.toMatchObject({ access_token: "a3" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("uses different requests for different refresh tokens", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => ok({ access_token: "a" }))
    await refreshKeycloakTokens(config, "r-one")
    await refreshKeycloakTokens(config, "r-two")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe("buildEndSessionUrl", () => {
  it("builds an RP-initiated logout URL", () => {
    const url = new URL(
      buildEndSessionUrl(config, {
        idTokenHint: "id.tok.en",
        redirectTo: "http://localhost:11092/sign-in",
      })
    )
    expect(url.origin + url.pathname).toBe(
      "http://kc.test/realms/wattprint/protocol/openid-connect/logout"
    )
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "wattprint-web",
      id_token_hint: "id.tok.en",
      post_logout_redirect_uri: "http://localhost:11092/sign-in",
    })
  })
})
